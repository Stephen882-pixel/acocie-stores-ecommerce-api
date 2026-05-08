
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');
const validate = require('../../../middleware/validate');
const authSchema = require('../schemas/auth.schema');

// PUBLIC ROUTES
router.post('/register',       validate(authSchema.signup),          authController.signup);
router.post('/verify-otp',     validate(authSchema.verifyOTP),       authController.verifyOTP);
router.post('/login',          validate(authSchema.login),           authController.login);
router.post('/refresh-token',  validate(authSchema.refreshToken),    authController.refreshToken);
router.post('/forgot-password',validate(authSchema.forgotPassword),  authController.forgotPassword);
router.post('/verify-reset-otp',validate(authSchema.verifyResetOTP),authController.verifyResetOTP);
router.post('/reset-password', validate(authSchema.resetPassword),   authController.resetPassword);

// PROTECTED ROUTES
router.post('/logout',         authenticate, validate(authSchema.logout),         authController.logout);
router.post('/change-password',authenticate, validate(authSchema.changePassword), authController.changePassword);

module.exports = router;