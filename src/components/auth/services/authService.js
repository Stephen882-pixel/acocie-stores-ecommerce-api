const { User, OTPCode, RefreshToken, LoginHistory } = require('../../../models');
const authUtils = require('../utils/authUtils');
const emailService = require('./emailService');
const { Op } = require('sequelize');
const { sequelize } = require('../../../config/database');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const signup = async ({ firstName, lastName, email, password, phone }) => {
    if (!firstName || !lastName || !email || !password) {
        throw createError('All fields are required', 400);
    }

    if (!authUtils.isValidEmail(email)) {
        throw createError('Invalid email format', 400);
    }

    if (!authUtils.isStrongPassword(password)) {
        throw createError('Password must be at least 8 characters with uppercase, lowercase, and number', 400);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw createError('Email already registered', 409);
    }

    const passwordHash = await authUtils.hashPassword(password);
    const userRole = 'customer'; 

    const user = await User.create({ firstName, lastName, email, phone, passwordHash, role: userRole });

    const otpCode = authUtils.generateOTP();
    await OTPCode.create({
        userId: user.id,
        email,
        otpCode,
        purpose: 'signup',
        expiresAt: authUtils.getOTPExpiry()
    });

    await emailService.sendSignUpOTP(email, firstName, otpCode);

    return {
        message: 'Signup successful! Please check your email for OTP verification.',
        email,
        userId: user.id,
        userRole: user.role
    };
};

const verifyOTP = async ({ email, otpCode }) => {
    if (!email || !otpCode) {
        throw createError('Email and OTP Code are required', 400);
    }

    const transaction = await sequelize.transaction();

    try {
        const otp = await OTPCode.findOne({
            where: {
                email,
                otpCode,
                purpose: 'signup',
                isUsed: false,
                expiresAt: { [Op.gt]: new Date() }
            },
            order: [['created_at', 'DESC']],
            transaction
        });

        if (!otp) {
            await transaction.rollback();
            throw createError('Invalid or expired OTP code', 400);
        }

        const user = await User.findOne({ where: { email }, transaction });

        if (!user) {
            await transaction.rollback();
            throw createError('User not found', 404);
        }

        await otp.update({ isUsed: true }, { transaction });
        await user.update({ isVerified: true }, { transaction });
        await transaction.commit();

        await emailService.sendWelcomeEmail(email, user.firstName);

        return { message: 'Email verified successfully! You can now log in.' };
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        throw error;
    }
};

const login = async ({ email, password, ip, userAgent }) => {
    if (!email || !password) {
        throw createError('Email and password are required', 400);
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
        await LoginHistory.create({ userId: null, ipAddress: ip, userAgent, status: 'failed' });
        throw createError('Invalid email or password', 401);
    }

    if (!user.isVerified) {
        throw Object.assign(createError('Please verify your email first', 403), { needsVerification: true });
    }

    const isPasswordValid = await authUtils.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
        await LoginHistory.create({ userId: user.id, ipAddress: ip, userAgent, status: 'failed' });
        throw createError('Invalid email or password', 401);
    }

    const accessToken = authUtils.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = authUtils.generateRefreshToken(user.id, user.email);
    const refreshExpiry = authUtils.getTokenExpiry(process.env.JWT_REFRESH_EXPIRY || '7d');

    await RefreshToken.create({ userId: user.id, token: refreshToken, expiresAt: refreshExpiry });
    await user.update({ lastLoginAt: new Date() });
    await LoginHistory.create({ userId: user.id, ipAddress: ip, userAgent, status: 'success' });

    return {
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
        }
    };
};

const refreshToken = async (token) => {
    if (!token) {
        throw createError('Refresh token is required', 400);
    }

    const decoded = authUtils.verifyRefreshToken(token);
    if (!decoded) {
        throw createError('Invalid refresh token', 401);
    }

    const tokenRecord = await RefreshToken.findOne({
        where: { token, expiresAt: { [Op.gt]: new Date() } }
    });

    if (!tokenRecord) {
        throw createError('Refresh token not found or expired', 401);
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
        throw createError('User not found or inactive', 401);
    }

    const accessToken = authUtils.generateAccessToken(user.id, user.email, user.role);

    return { message: 'Token refreshed successfully', accessToken };
};

const logout = async (token) => {
    if (token) {
        await RefreshToken.destroy({ where: { token } });
    }
    return { message: 'Logged out successfully' };
};

const forgotPassword = async (email) => {
    if (!email) {
        throw createError('Email is required', 400);
    }

    const user = await User.findOne({ where: { email } });

    // Always return the same message to prevent email enumeration
    if (!user) {
        return { message: 'If email exists, an OTP has been sent' };
    }

    const otpCode = authUtils.generateOTP();
    await OTPCode.create({
        userId: user.id,
        email,
        otpCode,
        purpose: 'password_reset',
        expiresAt: authUtils.getOTPExpiry()
    });

    await emailService.sendPasswordResetOTP(email, user.firstName, otpCode);

    return { message: 'If email exists, an OTP has been sent' };
};

const verifyResetOTP = async ({ email, otpCode }) => {
    if (!email || !otpCode) {
        throw createError('Email and OTP Code are required', 400);
    }

    const otp = await OTPCode.findOne({
        where: {
            email,
            otpCode,
            purpose: 'password_reset',
            isUsed: false,
            expiresAt: { [Op.gt]: new Date() }
        },
        order: [['createdAt', 'DESC']]
    });

    if (!otp) {
        throw createError('Invalid or expired OTP code', 400);
    }

    await otp.update({ isUsed: true });

    return { message: 'OTP verified. You can now reset your password.', email };
};

const resetPassword = async ({ email, newPassword, confirmPassword }) => {
    if (!email || !newPassword || !confirmPassword) {
        throw createError('All fields are required', 400);
    }

    if (newPassword !== confirmPassword) {
        throw createError('Passwords do not match', 400);
    }

    if (!authUtils.isStrongPassword(newPassword)) {
        throw createError('Password must be at least 8 characters with uppercase, lowercase, and number', 400);
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw createError('User not found', 404);
    }

    const newPasswordHash = await authUtils.hashPassword(newPassword);
    await user.update({ passwordHash: newPasswordHash });
    await RefreshToken.destroy({ where: { userId: user.id } });

    return { message: 'Password reset successfully. Please login with your new password.' };
};

const changePassword = async ({ userId, currentPassword, newPassword, confirmPassword }) => {
    if (!currentPassword || !newPassword || !confirmPassword) {
        throw createError('All fields are required', 400);
    }

    if (newPassword !== confirmPassword) {
        throw createError('New passwords do not match', 400);
    }

    if (!authUtils.isStrongPassword(newPassword)) {
        throw createError('Password must be at least 8 characters with uppercase, lowercase, and number', 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
        throw createError('User not found', 404);
    }

    const isPasswordValid = await authUtils.comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        throw createError('Current password is incorrect', 401);
    }

    const newPasswordHash = await authUtils.hashPassword(newPassword);
    await user.update({ passwordHash: newPasswordHash });
    await RefreshToken.destroy({ where: { userId: user.id } });

    return { message: 'Password changed successfully' };
};

module.exports = {
    signup,
    verifyOTP,
    login,
    refreshToken,
    logout,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    changePassword
};
