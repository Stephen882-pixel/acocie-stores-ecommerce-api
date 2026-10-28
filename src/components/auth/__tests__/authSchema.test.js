const authSchema = require('../schemas/auth.schema');

const validate = (schema, body) => schema.validate(body, { abortEarly: false, stripUnknown: true, convert: true });

describe('auth.schema', () => {
    describe('signup', () => {
        const valid = {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'Jane@Example.com ',
            password: 'Passw0rd',
            phone: '+254700000000'
        };

        it('accepts a valid payload and normalises the email', () => {
            const { error, value } = validate(authSchema.signup, valid);

            expect(error).toBeUndefined();
            expect(value.email).toBe('jane@example.com');
        });

        it('strips unknown fields such as role', () => {
            const { error, value } = validate(authSchema.signup, { ...valid, role: 'super_admin', isVerified: true });

            expect(error).toBeUndefined();
            expect(value).not.toHaveProperty('role');
            expect(value).not.toHaveProperty('isVerified');
        });

        it('allows phone to be omitted or empty', () => {
            const { phone, ...noPhone } = valid;
            expect(validate(authSchema.signup, noPhone).error).toBeUndefined();
            expect(validate(authSchema.signup, { ...valid, phone: '' }).error).toBeUndefined();
        });

        it.each([
            ['short first name', { firstName: 'J' }],
            ['invalid email', { email: 'not-an-email' }],
            ['weak password', { password: 'password' }],
            ['short password', { password: 'Pa1' }],
            ['invalid phone', { phone: '12' }]
        ])('rejects a %s', (_, override) => {
            expect(validate(authSchema.signup, { ...valid, ...override }).error).toBeDefined();
        });

        it('reports every invalid field at once', () => {
            const { error } = validate(authSchema.signup, {});
            const fields = error.details.map((d) => d.path[0]);

            expect(fields).toEqual(expect.arrayContaining(['firstName', 'lastName', 'email', 'password']));
        });
    });

    describe('verifyOTP', () => {
        it('accepts a 6-digit code', () => {
            expect(validate(authSchema.verifyOTP, { email: 'a@b.com', otpCode: '123456' }).error).toBeUndefined();
        });

        it.each(['12345', '1234567', '12a456'])('rejects %p', (otpCode) => {
            expect(validate(authSchema.verifyOTP, { email: 'a@b.com', otpCode }).error).toBeDefined();
        });
    });

    describe('login', () => {
        it('does not enforce password strength', () => {
            expect(validate(authSchema.login, { email: 'a@b.com', password: 'x' }).error).toBeUndefined();
        });

        it('requires a password', () => {
            expect(validate(authSchema.login, { email: 'a@b.com' }).error).toBeDefined();
        });
    });

    describe('resetPassword', () => {
        it('rejects a confirmPassword that does not match', () => {
            const { error } = validate(authSchema.resetPassword, {
                email: 'a@b.com', newPassword: 'Passw0rd', confirmPassword: 'Passw0rd1'
            });

            expect(error.details[0].message).toBe('Passwords do not match');
        });
    });

    describe('changePassword', () => {
        it('accepts matching strong passwords', () => {
            expect(validate(authSchema.changePassword, {
                currentPassword: 'anything', newPassword: 'Passw0rd', confirmPassword: 'Passw0rd'
            }).error).toBeUndefined();
        });

        it('rejects a weak new password', () => {
            expect(validate(authSchema.changePassword, {
                currentPassword: 'anything', newPassword: 'weakpass', confirmPassword: 'weakpass'
            }).error).toBeDefined();
        });
    });

    describe('logout', () => {
        it('allows an empty body', () => {
            expect(validate(authSchema.logout, {}).error).toBeUndefined();
        });
    });
});
