const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const validate = require('../../../middleware/validate');
const userSchema = require('../schemas/user.schema');

// All routes require authentication
router.use(authenticate);

// PROFILE MANAGEMENT
router.get('/profile', userController.getProfile);
router.put('/profile', validate(userSchema.updateProfile), userController.updateProfile);
router.delete('/delete', userController.deleteAccount);

// ADDRESS MANAGEMENT
router.get('/addresses', userController.getAddresses);
router.post('/addresses', validate(userSchema.addAddress),                userController.addAddress);
router.put('/addresses/:id', validate(userSchema.updateAddress),          userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

// LOGIN HISTORY
router.get('/login-history', userController.getLoginHistory);

module.exports = router;