/**
 * Auth Schemas (DTOs)
 *
 * Each schema defines:
 *  - the exact fields accepted for that endpoint
 *  - their types and constraints
 *  - which fields are required vs optional
 *
 * The `validate` middleware uses these schemas to reject invalid requests
 * before they ever reach a controller or service.  It also strips any
 * unrecognised fields, so database models are never exposed to raw,
 * unfiltered user input.
 */

const Joi = require('joi');

const email = Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .label('Email');

const password = Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
    .label('Password');

const otpCode = Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain digits only'
    })
    .label('OTP code');


const signup = Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required().label('First name'),
    lastName: Joi.string().trim().min(2).max(50).required().label('Last name'),
    email,
    password,
    phone: Joi.string()
        .trim()
        .pattern(/^\+?[1-9]\d{6,14}$/)
        .optional()
        .allow('')
        .messages({ 'string.pattern.base': 'Phone number is not valid' })
        .label('Phone'),
    role: Joi.string()
        .valid('customer', 'vendor')
        .default('customer')
        .label('Role')
});


const verifyOTP = Joi.object({
    email,
    otpCode
});


const login = Joi.object({
    email,
    password: Joi.string().required().label('Password')   // no strength check on login
});


const refreshToken = Joi.object({
    refreshToken: Joi.string().required().label('Refresh token')
});


const logout = Joi.object({
    refreshToken: Joi.string().optional().allow('').label('Refresh token')
});


const forgotPassword = Joi.object({
    email
});


const verifyResetOTP = Joi.object({
    email,
    otpCode
});

const resetPassword = Joi.object({
    email,
    newPassword: password.label('New password'),
    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({ 'any.only': 'Passwords do not match' })
        .label('Confirm password')
});


const changePassword = Joi.object({
    currentPassword: Joi.string().required().label('Current password'),
    newPassword: password.label('New password'),
    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({ 'any.only': 'Passwords do not match' })
        .label('Confirm password')
});


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
