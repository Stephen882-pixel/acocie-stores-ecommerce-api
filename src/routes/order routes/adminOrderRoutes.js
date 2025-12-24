const express = require('express');
const router = express.Router();
const adminOrderController = require('../../controllers/order controllers/adminOrderController');
const authenticate = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');


router.use(authenticate);
router.use(isAdmin);

router.get('/orders', adminOrderController.getAllOrders);
router.get('/dashboard/orders', adminOrderController.getAdminDashboardStats);
router.get('/orders/:id', adminOrderController.getOrderById);
router.put('/orders/:id/status', adminOrderController.updateOrderStatus);
router.put('/orders/:id/confirm', adminOrderController.confirmOrder);
router.get('/orders/:id/history', adminOrderController.getOrderHistory);
router.post('/orders/:id/notes', adminOrderController.addAdminNote);
router.get('/orders/cancellations', adminOrderController.getCancellationRequests);
router.put('/orders/cancellations/:id', adminOrderController.processCancellation);
router.get('/orders/returns', adminOrderController.getReturnRequests);
router.put('/orders/returns/:id', adminOrderController.processReturn);
router.post('/orders/:id/refund', adminOrderController.processRefund);

module.exports = router;