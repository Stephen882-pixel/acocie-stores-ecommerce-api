/**
 * Route-level tests for /api/v1/auth.
 *
 * Exercises the real router, Joi validation, controller and authenticate
 * middleware over HTTP. The service layer and DB models are mocked, so these
 * tests check request/response wiring, not business logic (see authService.test.js).
 */
jest.mock('../services/authService');
jest.mock('../../../models', () => ({
    User: { findByPk: jest.fn() }
}));

const express = require('express');
const { errorHandler } = require('../../../middleware/errorHandler');
const request = require('supertest');
const authService = require('../services/authService');
const { User } = require('../../../models');
const authUtils = require('../utils/authUtils');
const authRoutes = require('../routes/authRoutes');

// server.js connects to the DB and listens on import, so mount the router on a bare app.
const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use(errorHandler);
    return app;
};

const errorBody = (statusCode, code, message, details) =>
    ({ success: false, error: { statusCode, code, message, ...(details !== undefined && { details }) } });

const serviceError = (message, statusCode, extra = {}) =>
    Object.assign(new Error(message), { statusCode }, extra);

describe('Auth routes', () => {
    let app;

    beforeAll(() => {
        app = buildApp();
    });

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('POST /register', () => {
        const body = { firstName: 'Jane', lastName: 'Doe', email: 'JANE@example.com', password: 'Passw0rd' };

        it('returns 201 and passes the sanitised body to the service', async () => {
            authService.signup.mockResolvedValue({ message: 'ok', email: 'jane@example.com', userId: 'u1', userRole: 'customer' });

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({ ...body, role: 'admin' });

            expect(res.status).toBe(201);
            expect(res.body.data.userId).toBe('u1');
            expect(authService.signup).toHaveBeenCalledWith({
                firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: 'Passw0rd'
            });
        });

        it('returns 400 with per-field errors and never calls the service on invalid input', async () => {
            const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad' });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
            expect(res.body.error.details).toEqual(expect.arrayContaining([
                expect.objectContaining({ field: 'Email' }),
                expect.objectContaining({ field: 'Password' })
            ]));
            expect(authService.signup).not.toHaveBeenCalled();
        });

        it('maps a service error to its status code', async () => {
            authService.signup.mockRejectedValue(serviceError('Email already registered', 409));

            const res = await request(app).post('/api/v1/auth/register').send(body);

            expect(res.status).toBe(409);
            expect(res.body).toEqual(errorBody(409, 'CONFLICT', 'Email already registered'));
        });

        it('returns 500 for an unexpected error', async () => {
            authService.signup.mockRejectedValue(new Error('boom'));

            const res = await request(app).post('/api/v1/auth/register').send(body);

            expect(res.status).toBe(500);
        });
    });

    describe('POST /login', () => {
        const body = { email: 'jane@example.com', password: 'anything' };

        it('returns tokens and forwards ip and user-agent to the service', async () => {
            authService.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .set('User-Agent', 'jest-agent')
                .send(body);

            expect(res.status).toBe(200);
            expect(res.body.data.accessToken).toBe('a');
            expect(authService.login).toHaveBeenCalledWith(expect.objectContaining({
                email: 'jane@example.com',
                password: 'anything',
                userAgent: 'jest-agent',
                ip: expect.any(String)
            }));
        });

        it('sends the EMAIL_NOT_VERIFIED code for unverified users', async () => {
            authService.login.mockRejectedValue(
                serviceError('Please verify your email first', 403, { code: 'EMAIL_NOT_VERIFIED' })
            );

            const res = await request(app).post('/api/v1/auth/login').send(body);

            expect(res.status).toBe(403);
            expect(res.body).toEqual(errorBody(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first'));
        });

        it('returns 401 for bad credentials', async () => {
            authService.login.mockRejectedValue(serviceError('Invalid email or password', 401));

            const res = await request(app).post('/api/v1/auth/login').send(body);

            expect(res.status).toBe(401);
        });
    });

    describe('public endpoints wiring', () => {
        it.each([
            ['/verify-otp', 'verifyOTP', { email: 'a@b.com', otpCode: '123456' }, { email: 'a@b.com', otpCode: '123456' }],
            ['/refresh-token', 'refreshToken', { refreshToken: 'r-token' }, 'r-token'],
            ['/forgot-password', 'forgotPassword', { email: 'a@b.com' }, 'a@b.com'],
            ['/verify-reset-otp', 'verifyResetOTP', { email: 'a@b.com', otpCode: '123456' }, { email: 'a@b.com', otpCode: '123456' }],
            [
                '/reset-password',
                'resetPassword',
                { email: 'a@b.com', newPassword: 'Passw0rd', confirmPassword: 'Passw0rd' },
                { email: 'a@b.com', newPassword: 'Passw0rd', confirmPassword: 'Passw0rd' }
            ]
        ])('POST %s calls authService.%s', async (path, method, body, expectedArg) => {
            authService[method].mockResolvedValue({ message: 'ok' });

            const res = await request(app).post(`/api/v1/auth${path}`).send(body);

            expect(res.status).toBe(200);
            expect(authService[method]).toHaveBeenCalledWith(expectedArg);
        });

        it.each([
            ['/verify-otp', { email: 'a@b.com', otpCode: '12' }],
            ['/refresh-token', {}],
            ['/forgot-password', { email: 'nope' }],
            ['/reset-password', { email: 'a@b.com', newPassword: 'Passw0rd', confirmPassword: 'other' }]
        ])('POST %s returns 400 on invalid input', async (path, body) => {
            const res = await request(app).post(`/api/v1/auth${path}`).send(body);

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('protected endpoints', () => {
        let token;

        beforeEach(() => {
            token = authUtils.generateAccessToken('user-1', 'jane@example.com', 'customer');
            User.findByPk.mockResolvedValue({ id: 'user-1', status: 'active' });
        });

        describe('POST /logout', () => {
            it('requires authentication', async () => {
                const res = await request(app).post('/api/v1/auth/logout').send({});

                expect(res.status).toBe(401);
                expect(authService.logout).not.toHaveBeenCalled();
            });

            it('revokes the given refresh token', async () => {
                authService.logout.mockResolvedValue({ message: 'Logged out successfully' });

                const res = await request(app)
                    .post('/api/v1/auth/logout')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ refreshToken: 'r-token' });

                expect(res.status).toBe(200);
                expect(authService.logout).toHaveBeenCalledWith('r-token');
            });
        });

        describe('POST /change-password', () => {
            const body = { currentPassword: 'OldPassw0rd', newPassword: 'NewPassw0rd', confirmPassword: 'NewPassw0rd' };

            it('requires authentication', async () => {
                const res = await request(app).post('/api/v1/auth/change-password').send(body);

                expect(res.status).toBe(401);
                expect(authService.changePassword).not.toHaveBeenCalled();
            });

            it('uses the userId from the token, not the request body', async () => {
                authService.changePassword.mockResolvedValue({ message: 'Password changed successfully' });

                const res = await request(app)
                    .post('/api/v1/auth/change-password')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ ...body, userId: 'someone-else' });

                expect(res.status).toBe(200);
                expect(authService.changePassword).toHaveBeenCalledWith({ ...body, userId: 'user-1' });
            });

            it('returns 403 for a suspended account', async () => {
                User.findByPk.mockResolvedValue({ id: 'user-1', status: 'suspended' });

                const res = await request(app)
                    .post('/api/v1/auth/change-password')
                    .set('Authorization', `Bearer ${token}`)
                    .send(body);

                expect(res.status).toBe(403);
                expect(authService.changePassword).not.toHaveBeenCalled();
            });
        });
    });
});
