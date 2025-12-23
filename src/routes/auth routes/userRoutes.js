const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// PROFILE MANAGEMENT
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.delete('/delete', userController.deleteAccount);

// ADDRESS MANAGEMENT
router.get('/addresses', userController.getAddresses);
router.post('/addresses', userController.addAddress);
router.put('/addresses/:id', userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

// LOGIN HISTORY
router.get('/login-history', userController.getLoginHistory);

module.exports = router;