const jwt = require('jsonwebtoken');
const authUtils = require('../utils/authUtils');

describe('authUtils', () => {
    describe('generateOTP', () => {
        it('returns a 6-digit numeric string', () => {
            for (let i = 0; i < 50; i++) {
                expect(authUtils.generateOTP()).toMatch(/^\d{6}$/);
            }
        });
    });

    describe('hashPassword / comparePassword', () => {
        it('hashes a password and verifies it', async () => {
            const hash = await authUtils.hashPassword('Secret123');

            expect(hash).not.toBe('Secret123');
            await expect(authUtils.comparePassword('Secret123', hash)).resolves.toBe(true);
            await expect(authUtils.comparePassword('Wrong123', hash)).resolves.toBe(false);
        });
    });

    describe('access tokens', () => {
        it('generates a token that verifies and carries userId, email and role', () => {
            const token = authUtils.generateAccessToken('user-1', 'a@b.com', 'customer');
            const decoded = authUtils.verifyAccessToken(token);

            expect(decoded).toMatchObject({ userId: 'user-1', email: 'a@b.com', role: 'customer' });
        });

        it('returns null for a token signed with the wrong secret', () => {
            const token = jwt.sign({ userId: 'user-1' }, 'other-secret');
            expect(authUtils.verifyAccessToken(token)).toBeNull();
        });

        it('returns null for an expired token', () => {
            const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET, { expiresIn: -10 });
            expect(authUtils.verifyAccessToken(token)).toBeNull();
        });

        it('returns null for garbage input', () => {
            expect(authUtils.verifyAccessToken('not-a-jwt')).toBeNull();
        });
    });

    describe('refresh tokens', () => {
        it('generates a token verifiable only with the refresh secret', () => {
            const token = authUtils.generateRefreshToken('user-1', 'a@b.com');

            expect(authUtils.verifyRefreshToken(token)).toMatchObject({ userId: 'user-1', email: 'a@b.com' });
            expect(authUtils.verifyAccessToken(token)).toBeNull();
        });

        it('does not accept an access token as a refresh token', () => {
            const accessToken = authUtils.generateAccessToken('user-1', 'a@b.com', 'customer');
            expect(authUtils.verifyRefreshToken(accessToken)).toBeNull();
        });
    });

    describe('getTokenExpiry', () => {
        const NOW = new Date('2026-01-01T00:00:00Z').getTime();

        beforeEach(() => {
            jest.useFakeTimers().setSystemTime(NOW);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it.each([
            ['30m', 30 * 60 * 1000],
            ['2h', 2 * 60 * 60 * 1000],
            ['7d', 7 * 24 * 60 * 60 * 1000]
        ])('parses %s', (input, offsetMs) => {
            expect(authUtils.getTokenExpiry(input).getTime()).toBe(NOW + offsetMs);
        });

        it('falls back to 15 minutes for an unknown unit', () => {
            expect(authUtils.getTokenExpiry('10x').getTime()).toBe(NOW + 15 * 60 * 1000);
        });
    });

    describe('getOTPExpiry', () => {
        const NOW = new Date('2026-01-01T00:00:00Z').getTime();
        const originalExpiry = process.env.OTP_EXPIRY_MINUTES;

        beforeEach(() => {
            jest.useFakeTimers().setSystemTime(NOW);
        });

        afterEach(() => {
            jest.useRealTimers();
            process.env.OTP_EXPIRY_MINUTES = originalExpiry;
        });

        it('uses OTP_EXPIRY_MINUTES', () => {
            process.env.OTP_EXPIRY_MINUTES = '5';
            expect(authUtils.getOTPExpiry().getTime()).toBe(NOW + 5 * 60 * 1000);
        });

        it('defaults to 10 minutes when unset', () => {
            delete process.env.OTP_EXPIRY_MINUTES;
            expect(authUtils.getOTPExpiry().getTime()).toBe(NOW + 10 * 60 * 1000);
        });
    });

    describe('isValidEmail', () => {
        it.each(['user@example.com', 'first.last+tag@sub.domain.io'])('accepts %s', (email) => {
            expect(authUtils.isValidEmail(email)).toBe(true);
        });

        it.each(['plainaddress', 'no-at.com', 'user@nodot', 'user @example.com', ''])('rejects %p', (email) => {
            expect(authUtils.isValidEmail(email)).toBe(false);
        });
    });

    describe('isStrongPassword', () => {
        it('accepts a password with upper, lower, digit and 8+ chars', () => {
            expect(authUtils.isStrongPassword('Passw0rd')).toBe(true);
        });

        it.each([
            ['too short', 'Pa55wor'],
            ['no uppercase', 'passw0rd'],
            ['no lowercase', 'PASSW0RD'],
            ['no digit', 'Password']
        ])('rejects a password that is %s', (_, password) => {
            expect(authUtils.isStrongPassword(password)).toBe(false);
        });
    });
});
