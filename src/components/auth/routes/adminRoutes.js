const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// USER MANAGEMENT
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// DASHBOARD
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;

