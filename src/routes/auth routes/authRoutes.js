
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../../middleware/authMiddleware');

// PUBLIC ROUTES
router.post('/register', authController.signup);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOTP);
router.post('/reset-password', authController.resetPassword);

// PROTECTED ROUTES
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;