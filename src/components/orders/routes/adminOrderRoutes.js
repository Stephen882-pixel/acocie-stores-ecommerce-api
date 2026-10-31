const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../rbac/middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const validate = require('../../../middleware/validate');
const adminOrderSchema = require('../schemas/adminOrder.schema');

router.use(authenticate);

router.get('/orders',           requirePermission(P.ORDER_READ_ANY), validate(adminOrderSchema.getAllOrdersQuery, 'query'),  adminOrderController.getAllOrders);
router.get('/dashboard/orders', requirePermission(P.ADMIN_DASHBOARD_READ), adminOrderController.getAdminDashboardStats);
router.get('/orders/:id',       requirePermission(P.ORDER_READ_ANY), adminOrderController.getOrderById);
router.put('/orders/:id/status',  requirePermission(P.ORDER_UPDATE_STATUS_ANY), validate(adminOrderSchema.updateOrderStatus),   adminOrderController.updateOrderStatus);
router.put('/orders/:id/confirm', requirePermission(P.ORDER_CONFIRM), validate(adminOrderSchema.confirmOrder),         adminOrderController.confirmOrder);
router.get('/orders/:id/history', requirePermission(P.ORDER_READ_ANY), adminOrderController.getOrderHistory);
router.post('/orders/:id/notes',  requirePermission(P.ORDER_NOTE_ADMIN), validate(adminOrderSchema.addAdminNote),         adminOrderController.addAdminNote);
router.get('/orders/cancellations',      requirePermission(P.ORDER_CANCELLATION_PROCESS), adminOrderController.getCancellationRequests);
router.put('/orders/cancellations/:id',  requirePermission(P.ORDER_CANCELLATION_PROCESS), validate(adminOrderSchema.processCancellation), adminOrderController.processCancellation);
router.get('/orders/returns',     requirePermission(P.ORDER_RETURN_PROCESS), adminOrderController.getReturnRequests);
router.put('/orders/returns/:id', requirePermission(P.ORDER_RETURN_PROCESS), validate(adminOrderSchema.processReturn),        adminOrderController.processReturn);
router.post('/orders/:id/refund', requirePermission(P.ORDER_REFUND), validate(adminOrderSchema.processRefund),        adminOrderController.processRefund);

module.exports = router;