const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const validate = require('../../../middleware/validate');
const adminSchema = require('../schemas/admin.schema');

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// USER MANAGEMENT
router.get('/users', validate(adminSchema.getUsersQuery, 'query'), adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', validate(adminSchema.updateUserStatus), adminController.updateUserStatus);
router.put('/users/:id/role',   validate(adminSchema.updateUserRole),   adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// DASHBOARD
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;

