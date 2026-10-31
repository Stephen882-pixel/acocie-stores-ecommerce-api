jest.mock('../../../models', () => ({
    User: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
    OTPCode: { findOne: jest.fn(), create: jest.fn() },
    RefreshToken: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() },
    LoginHistory: { create: jest.fn() }
}));
jest.mock('../../../config/database', () => ({
    sequelize: { transaction: jest.fn() }
}));
jest.mock('../services/emailService', () => ({
    sendSignUpOTP: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetOTP: jest.fn()
}));

const { User, OTPCode, RefreshToken, LoginHistory } = require('../../../models');
const { sequelize } = require('../../../config/database');
const emailService = require('../services/emailService');
const authUtils = require('../utils/authUtils');
const authService = require('../services/authService');

const STRONG_PASSWORD = 'Passw0rd!';

const makeUser = (overrides = {}) => {
    const user = {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        role: 'customer',
        status: 'active',
        isVerified: true,
        passwordHash: 'hashed',
        ...overrides
    };
    user.update = jest.fn().mockResolvedValue(user);
    return user;
};

const makeTransaction = () => {
    const tx = { finished: undefined };
    tx.commit = jest.fn(async () => { tx.finished = 'commit'; });
    tx.rollback = jest.fn(async () => { tx.finished = 'rollback'; });
    return tx;
};

// Assert a service call rejects with the given message and HTTP status code.
const expectServiceError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe('authService', () => {
    describe('signup', () => {
        const input = {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            password: STRONG_PASSWORD,
            phone: '+254700000000'
        };

        beforeEach(() => {
            User.findOne.mockResolvedValue(null);
            User.create.mockImplementation(async (data) => ({ id: 'user-1', ...data }));
            OTPCode.create.mockResolvedValue({});
            emailService.sendSignUpOTP.mockResolvedValue(true);
            jest.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed-pw');
            jest.spyOn(authUtils, 'generateOTP').mockReturnValue('123456');
        });

        it('creates a customer, stores a signup OTP and emails it', async () => {
            const result = await authService.signup(input);

            expect(User.create).toHaveBeenCalledWith({
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane@example.com',
                phone: '+254700000000',
                passwordHash: 'hashed-pw',
                role: 'customer'
            });
            expect(OTPCode.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-1',
                email: 'jane@example.com',
                otpCode: '123456',
                purpose: 'signup',
                expiresAt: expect.any(Date)
            }));
            expect(emailService.sendSignUpOTP).toHaveBeenCalledWith('jane@example.com', 'Jane', '123456');
            expect(result).toEqual({
                message: expect.stringMatching(/signup successful/i),
                email: 'jane@example.com',
                userId: 'user-1',
                userRole: 'customer'
            });
        });

        it('never stores the plain-text password', async () => {
            await authService.signup(input);

            const created = User.create.mock.calls[0][0];
            expect(created).not.toHaveProperty('password');
            expect(JSON.stringify(created)).not.toContain(STRONG_PASSWORD);
        });

        it('ignores a client-supplied role and always creates a customer', async () => {
            await authService.signup({ ...input, role: 'super_admin' });

            expect(User.create.mock.calls[0][0].role).toBe('customer');
        });

        it.each(['firstName', 'lastName', 'email', 'password'])('rejects when %s is missing', async (field) => {
            await expectServiceError(
                authService.signup({ ...input, [field]: undefined }),
                'All fields are required',
                400
            );
            expect(User.create).not.toHaveBeenCalled();
        });

        it('rejects an invalid email', async () => {
            await expectServiceError(authService.signup({ ...input, email: 'nope' }), 'Invalid email format', 400);
        });

        it('rejects a weak password', async () => {
            await expectServiceError(
                authService.signup({ ...input, password: 'weak' }),
                expect.stringMatching(/at least 8 characters/),
                400
            );
        });

        it('rejects an email that is already registered', async () => {
            User.findOne.mockResolvedValue(makeUser());

            await expectServiceError(authService.signup(input), 'Email already registered', 409);
            expect(User.create).not.toHaveBeenCalled();
            expect(emailService.sendSignUpOTP).not.toHaveBeenCalled();
        });
    });

    describe('verifyOTP', () => {
        let tx;
        let otp;
        let user;

        beforeEach(() => {
            tx = makeTransaction();
            otp = { update: jest.fn().mockResolvedValue() };
            user = makeUser({ isVerified: false });
            sequelize.transaction.mockResolvedValue(tx);
            OTPCode.findOne.mockResolvedValue(otp);
            User.findOne.mockResolvedValue(user);
            emailService.sendWelcomeEmail.mockResolvedValue(true);
        });

        it('marks the OTP used and the user verified inside one transaction', async () => {
            const result = await authService.verifyOTP({ email: user.email, otpCode: '123456' });

            expect(OTPCode.findOne).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ email: user.email, otpCode: '123456', purpose: 'signup', isUsed: false }),
                transaction: tx
            }));
            expect(otp.update).toHaveBeenCalledWith({ isUsed: true }, { transaction: tx });
            expect(user.update).toHaveBeenCalledWith({ isVerified: true }, { transaction: tx });
            expect(tx.commit).toHaveBeenCalledTimes(1);
            expect(tx.rollback).not.toHaveBeenCalled();
            expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(user.email, 'Jane');
            expect(result.message).toMatch(/verified successfully/i);
        });

        it('rejects when email or OTP is missing without opening a transaction', async () => {
            await expectServiceError(authService.verifyOTP({ email: user.email }), 'Email and OTP Code are required', 400);
            expect(sequelize.transaction).not.toHaveBeenCalled();
        });

        it('rolls back exactly once when the OTP is invalid or expired', async () => {
            OTPCode.findOne.mockResolvedValue(null);

            await expectServiceError(
                authService.verifyOTP({ email: user.email, otpCode: '000000' }),
                'Invalid or expired OTP code',
                400
            );
            expect(tx.rollback).toHaveBeenCalledTimes(1);
            expect(tx.commit).not.toHaveBeenCalled();
            expect(user.update).not.toHaveBeenCalled();
        });

        it('rolls back exactly once when the user does not exist', async () => {
            User.findOne.mockResolvedValue(null);

            await expectServiceError(
                authService.verifyOTP({ email: user.email, otpCode: '123456' }),
                'User not found',
                404
            );
            expect(tx.rollback).toHaveBeenCalledTimes(1);
            expect(otp.update).not.toHaveBeenCalled();
        });

        it('rolls back and rethrows when a write fails mid-transaction', async () => {
            user.update.mockRejectedValue(new Error('db down'));

            await expect(authService.verifyOTP({ email: user.email, otpCode: '123456' })).rejects.toThrow('db down');
            expect(tx.rollback).toHaveBeenCalledTimes(1);
            expect(tx.commit).not.toHaveBeenCalled();
            expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        const credentials = { email: 'jane@example.com', password: STRONG_PASSWORD, ip: '127.0.0.1', userAgent: 'jest' };
        let user;

        beforeEach(() => {
            user = makeUser();
            User.findOne.mockResolvedValue(user);
            LoginHistory.create.mockResolvedValue({});
            RefreshToken.create.mockResolvedValue({});
            jest.spyOn(authUtils, 'comparePassword').mockResolvedValue(true);
        });

        it('issues tokens, persists the refresh token and records a successful login', async () => {
            const result = await authService.login(credentials);

            expect(authUtils.verifyAccessToken(result.accessToken)).toMatchObject({
                userId: 'user-1', email: 'jane@example.com', role: 'customer'
            });
            expect(authUtils.verifyRefreshToken(result.refreshToken)).toMatchObject({ userId: 'user-1' });
            expect(RefreshToken.create).toHaveBeenCalledWith({
                userId: 'user-1',
                token: result.refreshToken,
                expiresAt: expect.any(Date)
            });
            expect(user.update).toHaveBeenCalledWith({ lastLoginAt: expect.any(Date) });
            expect(LoginHistory.create).toHaveBeenCalledWith({
                userId: 'user-1', ipAddress: '127.0.0.1', userAgent: 'jest', status: 'success'
            });
            expect(result.user).toEqual({
                id: 'user-1',
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane@example.com',
                role: 'customer',
                isVerified: true
            });
        });

        it('does not leak the password hash in the response', async () => {
            const result = await authService.login(credentials);
            expect(JSON.stringify(result)).not.toContain('hashed');
        });

        it('rejects when email or password is missing', async () => {
            await expectServiceError(authService.login({ email: credentials.email }), 'Email and password are required', 400);
            expect(User.findOne).not.toHaveBeenCalled();
        });

        it('returns a generic 401 and logs a failed attempt for an unknown email', async () => {
            User.findOne.mockResolvedValue(null);

            await expectServiceError(authService.login(credentials), 'Invalid email or password', 401);
            expect(LoginHistory.create).toHaveBeenCalledWith(expect.objectContaining({ userId: null, status: 'failed' }));
        });

        it('returns the same generic 401 and logs a failed attempt for a wrong password', async () => {
            authUtils.comparePassword.mockResolvedValue(false);

            await expectServiceError(authService.login(credentials), 'Invalid email or password', 401);
            expect(LoginHistory.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', status: 'failed' }));
            expect(RefreshToken.create).not.toHaveBeenCalled();
        });

        it('blocks unverified users with the EMAIL_NOT_VERIFIED code', async () => {
            User.findOne.mockResolvedValue(makeUser({ isVerified: false }));

            await expect(authService.login(credentials)).rejects.toMatchObject({
                message: 'Please verify your email first',
                statusCode: 403,
                code: 'EMAIL_NOT_VERIFIED'
            });
            expect(RefreshToken.create).not.toHaveBeenCalled();
        });
    });

    describe('refreshToken', () => {
        let token;

        beforeEach(() => {
            token = authUtils.generateRefreshToken('user-1', 'jane@example.com');
            RefreshToken.findOne.mockResolvedValue({ token });
            User.findByPk.mockResolvedValue(makeUser());
        });

        it('returns a new access token for a valid, stored refresh token', async () => {
            const result = await authService.refreshToken(token);

            expect(User.findByPk).toHaveBeenCalledWith('user-1');
            expect(authUtils.verifyAccessToken(result.accessToken)).toMatchObject({ userId: 'user-1', role: 'customer' });
        });

        it('rejects a missing token', async () => {
            await expectServiceError(authService.refreshToken(undefined), 'Refresh token is required', 400);
        });

        it('rejects a token with an invalid signature without hitting the DB', async () => {
            await expectServiceError(authService.refreshToken('garbage'), 'Invalid refresh token', 401);
            expect(RefreshToken.findOne).not.toHaveBeenCalled();
        });

        it('rejects a token that is not stored (revoked or expired)', async () => {
            RefreshToken.findOne.mockResolvedValue(null);
            await expectServiceError(authService.refreshToken(token), 'Refresh token not found or expired', 401);
        });

        it.each([
            ['deleted', null],
            ['suspended', makeUser({ status: 'suspended' })],
            ['banned', makeUser({ status: 'banned' })]
        ])('rejects when the user is %s', async (_, foundUser) => {
            User.findByPk.mockResolvedValue(foundUser);
            await expectServiceError(authService.refreshToken(token), 'User not found or inactive', 401);
        });
    });

    describe('logout', () => {
        it('deletes the given refresh token', async () => {
            RefreshToken.destroy.mockResolvedValue(1);

            const result = await authService.logout('tok');

            expect(RefreshToken.destroy).toHaveBeenCalledWith({ where: { token: 'tok' } });
            expect(result.message).toMatch(/logged out/i);
        });

        it('succeeds without touching the DB when no token is given', async () => {
            await expect(authService.logout(undefined)).resolves.toEqual({ message: 'Logged out successfully' });
            expect(RefreshToken.destroy).not.toHaveBeenCalled();
        });
    });

    describe('forgotPassword', () => {
        beforeEach(() => {
            OTPCode.create.mockResolvedValue({});
            emailService.sendPasswordResetOTP.mockResolvedValue(true);
            jest.spyOn(authUtils, 'generateOTP').mockReturnValue('654321');
        });

        it('creates a password_reset OTP and emails it', async () => {
            User.findOne.mockResolvedValue(makeUser());

            await authService.forgotPassword('jane@example.com');

            expect(OTPCode.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-1', otpCode: '654321', purpose: 'password_reset'
            }));
            expect(emailService.sendPasswordResetOTP).toHaveBeenCalledWith('jane@example.com', 'Jane', '654321');
        });

        it('returns the same response for an unknown email (no enumeration)', async () => {
            User.findOne.mockResolvedValueOnce(makeUser());
            const known = await authService.forgotPassword('jane@example.com');

            User.findOne.mockResolvedValueOnce(null);
            const unknown = await authService.forgotPassword('ghost@example.com');

            expect(unknown).toEqual(known);
            expect(emailService.sendPasswordResetOTP).toHaveBeenCalledTimes(1);
        });

        it('rejects a missing email', async () => {
            await expectServiceError(authService.forgotPassword(''), 'Email is required', 400);
        });
    });

    describe('verifyResetOTP', () => {
        it('marks a valid password_reset OTP as used', async () => {
            const otp = { update: jest.fn().mockResolvedValue() };
            OTPCode.findOne.mockResolvedValue(otp);

            const result = await authService.verifyResetOTP({ email: 'jane@example.com', otpCode: '654321' });

            expect(OTPCode.findOne.mock.calls[0][0].where).toMatchObject({
                email: 'jane@example.com', otpCode: '654321', purpose: 'password_reset', isUsed: false
            });
            expect(otp.update).toHaveBeenCalledWith({ isUsed: true });
            expect(result.email).toBe('jane@example.com');
        });

        it('rejects an invalid or expired OTP', async () => {
            OTPCode.findOne.mockResolvedValue(null);
            await expectServiceError(
                authService.verifyResetOTP({ email: 'jane@example.com', otpCode: '000000' }),
                'Invalid or expired OTP code',
                400
            );
        });

        it('rejects missing fields', async () => {
            await expectServiceError(
                authService.verifyResetOTP({ email: 'jane@example.com' }),
                'Email and OTP Code are required',
                400
            );
        });
    });

    describe('resetPassword', () => {
        const input = { email: 'jane@example.com', newPassword: STRONG_PASSWORD, confirmPassword: STRONG_PASSWORD };

        beforeEach(() => {
            RefreshToken.destroy.mockResolvedValue(1);
            jest.spyOn(authUtils, 'hashPassword').mockResolvedValue('new-hash');
        });

        it('updates the hash and revokes all refresh tokens for the user', async () => {
            const user = makeUser();
            User.findOne.mockResolvedValue(user);

            await authService.resetPassword(input);

            expect(user.update).toHaveBeenCalledWith({ passwordHash: 'new-hash' });
            expect(RefreshToken.destroy).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
        });

        it('rejects mismatched passwords', async () => {
            await expectServiceError(
                authService.resetPassword({ ...input, confirmPassword: 'Different1' }),
                'Passwords do not match',
                400
            );
        });

        it('rejects a weak password', async () => {
            await expectServiceError(
                authService.resetPassword({ ...input, newPassword: 'weak', confirmPassword: 'weak' }),
                expect.stringMatching(/at least 8 characters/),
                400
            );
        });

        it('rejects an unknown user', async () => {
            User.findOne.mockResolvedValue(null);
            await expectServiceError(authService.resetPassword(input), 'User not found', 404);
        });
    });

    describe('changePassword', () => {
        const input = {
            userId: 'user-1',
            currentPassword: 'OldPassw0rd',
            newPassword: STRONG_PASSWORD,
            confirmPassword: STRONG_PASSWORD
        };
        let user;

        beforeEach(() => {
            user = makeUser();
            User.findByPk.mockResolvedValue(user);
            RefreshToken.destroy.mockResolvedValue(1);
            jest.spyOn(authUtils, 'comparePassword').mockResolvedValue(true);
            jest.spyOn(authUtils, 'hashPassword').mockResolvedValue('new-hash');
        });

        it('updates the hash and revokes all refresh tokens', async () => {
            const result = await authService.changePassword(input);

            expect(authUtils.comparePassword).toHaveBeenCalledWith('OldPassw0rd', 'hashed');
            expect(user.update).toHaveBeenCalledWith({ passwordHash: 'new-hash' });
            expect(RefreshToken.destroy).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
            expect(result.message).toMatch(/changed successfully/i);
        });

        it('rejects an incorrect current password', async () => {
            authUtils.comparePassword.mockResolvedValue(false);

            await expectServiceError(authService.changePassword(input), 'Current password is incorrect', 401);
            expect(user.update).not.toHaveBeenCalled();
        });

        it('rejects mismatched new passwords', async () => {
            await expectServiceError(
                authService.changePassword({ ...input, confirmPassword: 'Other1234' }),
                'New passwords do not match',
                400
            );
        });

        it('rejects an unknown user', async () => {
            User.findByPk.mockResolvedValue(null);
            await expectServiceError(authService.changePassword(input), 'User not found', 404);
        });
    });
});
