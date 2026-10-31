const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const { requirePermission } = require('../../rbac/middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const validate = require('../../../middleware/validate');
const adminSchema = require('../schemas/admin.schema');

// All routes require authentication; each route checks its own permission
router.use(authenticate);

// USER MANAGEMENT
router.get('/users', requirePermission(P.USER_READ_ANY), validate(adminSchema.getUsersQuery, 'query'), adminController.getAllUsers);
router.get('/users/:id', requirePermission(P.USER_READ_ANY), adminController.getUserById);
router.put('/users/:id/status', requirePermission(P.USER_UPDATE_STATUS), validate(adminSchema.updateUserStatus), adminController.updateUserStatus);
router.put('/users/:id/role',   requirePermission(P.USER_ROLE_ASSIGN), validate(adminSchema.updateUserRole),   adminController.updateUserRole);
router.delete('/users/:id', requirePermission(P.USER_DELETE), adminController.deleteUser);

// DASHBOARD
router.get('/dashboard/stats', requirePermission(P.ADMIN_DASHBOARD_READ), adminController.getDashboardStats);

// VENDOR APPROVAL
router.get('/vendor-requests',            requirePermission(P.VENDOR_REQUEST_REVIEW), validate(adminSchema.getVendorRequestsQuery, 'query'), adminController.getVendorRequests);
router.put('/vendor-requests/:id/approve', requirePermission(P.VENDOR_REQUEST_REVIEW), adminController.approveVendor);
router.put('/vendor-requests/:id/reject',  requirePermission(P.VENDOR_REQUEST_REVIEW), adminController.rejectVendor);

module.exports = router;

