

const { user, OTPCode, RefreshToken, LoginHistory } = require('../models');
const authUtils = require('../utils/authUtils');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');
const e = require('express');

const signup = async (req,res) => {
    try{
        const { firstName, lastName, email, password, phone, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!authUtils.isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!authUtils.isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }

    const existingUser = await User.findOne({
        where:{email}
    });
    if(existingUser){
        return res.status(409).json({error: 'Email already registered'});
    }
    const passwordHash = await authUtils.hashPassword(password);
    const userRole = role === 'vendor' ? 'vendor': 'customer';

    const user = await user.create({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      role: userRole
    })

    const otpCode = authUtils.generateOTP();
    await OTPCode.create({
      userId: user.id,
      email,
      otpCode,
      purpose: 'signup',
      expiresAt: authUtils.getOTPExpiry()
    });

    await emailService.sendSignUpOTP(email,firstName,otpCode);

    res.status(201).json({
        message:'Signup successful! Please check your email for OTP verification.',
        email,
        userId:user.id
    });
    } catch (error){
        console.error('Error in signup:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
};

const verifyOTP = async (req,res) => {
    try{
        const { email,otpCode } = req.body;

        if(!email || !otpCode){
            return res.status(400).json({error: 'Email and OTP Code are required'});
        }

        const otp = await OTPCode.findOne({
            where: {
                email,
                otpCode,
                purpose:'signup',
                isUsed:false,
                expiresAt:{ [Op.gt]: new Date() }
            },
            order: [['createdAt','DESC']]
        });

        if(!otp){
            return res.status(400).json({error: 'Invalid or expired OTP code'});
        }

        await otp.update({ isUsed:true });
        await user.update({ isVerified:true },{ where: { email } });

        const user = await user.findOne({ where: {email} });
        await emailService.sendWelcomeEmail(email,user.firstName);

        res.json({
            message: 'Email verified successfully! You can now log in.'
        });
    } catch (error){
        console.error('Error in verifyOTP:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

const login = async (req,res) => {
    try{
        const { email, password } = req.body;

        if(!email || !password){
            return res.status(400).json({error:'Email and password are required'});
        }

        const user = await user.findOne({where: { email }});

        if(!user){
            await LoginHistory.create({
                userId: null,
                ipAddress:req.ip,
                userAgent:req.get('user-agent'),
                status:'failed'
            });
            return res.status(401).json({error: 'Invalid email or password'});
        }

        if(!user.isVerified){
            return res.status(403).json({
                error: 'Please verify your email first',
                needsVerification:true
            });
        }

        const isPasswordValid = await authUtils.comparePassword(password,user.passwordHash);


        if(!isPasswordValid){
            await LoginHistory.create({
                userId:user.id,
                ipAddress:req.ip,
                userAgent:req.get('user-agent'),
                status:'failed'
            });
            return res.status(401).json({error:'Invalid email or password'});
        }

        const accessToken = authUtils.generateAccessToken(user.id,user.email,user.role);
        const refreshToken = authUtils.generateRefreshToken(user.id,user.email);


        const refreshExpiry = authUtils.getTokenExpiry(process.env.JWT_REFRESH_EXPIRY || '7d');
        await RefreshToken.create({
            userId: user.id,
            token: refreshToken,
            expiresAt: refreshExpiry
        });

        await user.update({ lastLoginAt: new Date() });

        await LoginHistory.create({
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            status: 'success' 
        });

        res.json({
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
    });
    } catch (error){
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Failed to log in' });
    }
};

const refreshToken = async (req,res) => {
    try{
        const { refreshToken: token } = req.body;

        if(!token){
            return res.status(400).json({error:'Refresh Token is required'});
        }

        const decoded = authUtils.verifyRefreshToken(token);
        if(!decoded){
            return res.status(401).json({error:'Invalid refresh token'});
        }

        const tokenRecord = await RefreshToken.findOne({
            where:{
                token,
                expiresAt:{[Op.gt]: new Date()}
            }
        });

        if(!tokenRecord){
            return res.status(401).json({error:'Refresh token not found or expired'});
        }

        const user = await user.findByPk(decoded.userId);
        if(!user || user.status == 'active'){
            return res.status(401).json({error:'User not found or inactive'});
        }

        const accessToken = authUtils.generateAccessToken(user.id,user.email,user.role);

        res.json({
            message:'Token refreshed successfully',
            accessToken
        });
    } catch(error){
        console.error('Error in refreshToken:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
};


const logout = async (req,res) => {
    try{
        const { refreshToken: token } = req.body;

        if(token){
            await RefreshToken.destroy({where: { token }});
        }

        res.json({message:'Logged out successfully'});
    } catch (error){
        console.error('Error in logout:', error);
        res.status(500).json({ error: 'Failed to log out' });
    }
};

const forgotPassword = async (req,res) => {
    try{
        const { email } =  req.body;

        if(!email){
            return res.status(400).json({error:'Email is rerquired'});
        }

        const user = await user.findOne({where: {email}});

        if(!user){
            return res.json({message:'If email exists,OTP has been sent'});
        }

        const otpCode = authUtils.generateOTP();
        await OTPCode.create({
            userId: user.id,
            email,
            otpCode,
            purpose:'password_reset',
            expiresAt:authUtils.getOTPExpiry() 
        });

        await emailService.sendPasswordResetOTP(email,user.firstName,otpCode);

        res.json({message:'If email exists, an OTP has been sent'});
    } catch (error){
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
};

const verifyResetOTP = async (req,res) => {
    try{
        const { email,otpCode } = req.body;

        if(!email || !otpCode){
            return res.status(400).json({
                error:'Email and OTP Code are required'
            });
        }

        const otp = await OTPCode.findOne({
            where: {
                email,
                otpCode,
                purpose:'password_reset',
                isUsed:false,
                expiresAt:{ [Op.gt]: new Date() }
            },
            order:[[ 'createdAt','DESC' ]]
        });

        if(!otp){
            return res.status(400).json({
                error:'Invalid or expired otp code',
            })
        }

        await otp.update({ isUsed: true });

        res.json({
            message:'OTP Verified.You can now reset your password.',
            email
        });
    } catch (error){
        console.error('Error in verifyResetOTP:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

const  resetPassword = async (req,res) => {
    try{
        const { email,newPassword,confirmPassword } = req.body;

        if(!email || !newPassword || !confirmPassword){
            return res.json(400).json({
                error:'All fields are required'
            });
        }

        if(newPassword !== confirmPassword){
            return res.status(400).json({
                error:'Passwords do not match'
            });
        }

        if(!authUtils.isStrongPassword(newPassword)){
            return res.status(400).json({
                error:'Passwords must be atleast 8 characters with uppercase, lowercase, and number'
            });
        }

        const user = await user.findOne({ where: { email } });

        if(!user){
            return res.status(404).json({
                error:'User not found'
            });
        }

        const newPasswordHash = await authUtils.hashPassword(newPassword);
        await user.update({ passwordHash: newPasswordHash });
        await RefreshToken.destroy({
            where: {
                userId:user.id
            } 
        });

        res.json({message:'Password reset successfully. Please login with your new password.'});
    } catch (error){
        console.error('Error in resetPassword:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};


const changePassword = async (req,res) => {
    try{
        const { currentPassword, newPassword, confirmPassword } = req.body;

        const userId =  req.user.userId;

        if(!currentPassword || !newPassword || !confirmPassword){
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match' });
        }

        if (!authUtils.isStrongPassword(newPassword)) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
        });
        }

        const user = await User.findByPk(userId);

        if (!user) {
        return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordValid = await authUtils.comparePassword(currentPassword, user.passwordHash);

        if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newPasswordHash = await authUtils.hashPassword(newPassword);
        await user.update({ passwordHash: newPasswordHash });
        await RefreshToken.destroy({ where: { userId: user.id } });

        res.json({ message: 'Password changed successfully' });
    } catch(error){
        console.error('Error in changePassword:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};


