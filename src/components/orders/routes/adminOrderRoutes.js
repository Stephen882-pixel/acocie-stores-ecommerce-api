const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { isAdmin } = require('../../auth/middleware/roleMiddleware');
const validate = require('../../../middleware/validate');
const adminOrderSchema = require('../schemas/adminOrder.schema');

router.use(authenticate);
router.use(isAdmin);

router.get('/orders',           validate(adminOrderSchema.getAllOrdersQuery, 'query'),  adminOrderController.getAllOrders);
router.get('/dashboard/orders', adminOrderController.getAdminDashboardStats);
router.get('/orders/:id',       adminOrderController.getOrderById);
router.put('/orders/:id/status',  validate(adminOrderSchema.updateOrderStatus),   adminOrderController.updateOrderStatus);
router.put('/orders/:id/confirm', validate(adminOrderSchema.confirmOrder),         adminOrderController.confirmOrder);
router.get('/orders/:id/history', adminOrderController.getOrderHistory);
router.post('/orders/:id/notes',  validate(adminOrderSchema.addAdminNote),         adminOrderController.addAdminNote);
router.get('/orders/cancellations',      adminOrderController.getCancellationRequests);
router.put('/orders/cancellations/:id',  validate(adminOrderSchema.processCancellation), adminOrderController.processCancellation);
router.get('/orders/returns',     adminOrderController.getReturnRequests);
router.put('/orders/returns/:id', validate(adminOrderSchema.processReturn),        adminOrderController.processReturn);
router.post('/orders/:id/refund', validate(adminOrderSchema.processRefund),        adminOrderController.processRefund);

module.exports = router;