const express = require('express');
const router = express.Router();
const vendorOrderController = require('../../controllers/order controllers/vendorOrderController');
const authenticate = require('../../middleware/authMiddleware');
const { authorize } = require('../../middleware/roleMiddleware');


router.use(authenticate);
router.use(authorize('vendor', 'admin', 'super_admin'));

router.get('/orders', vendorOrderController.getVendorOrders);
router.get('/dashboard/stats', vendorOrderController.getVendorDashboardStats);
router.get('/orders/:id', vendorOrderController.getVendorOrderById);
router.put('/orders/:id/accept', vendorOrderController.acceptOrder);
router.put('/orders/:id/ship', vendorOrderController.shipOrder);
router.put('/orders/:id/deliver', vendorOrderController.markAsDelivered);
router.put('/orders/:id/tracking', vendorOrderController.updateTracking);
router.post('/orders/:id/notes', vendorOrderController.addVendorNote);

module.exports = router;