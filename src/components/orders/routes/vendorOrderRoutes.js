const express = require('express');
const router = express.Router();
const vendorOrderController = require('../controllers/vendorOrderController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { authorize } = require('../../auth/middleware/roleMiddleware');
const validate = require('../../../middleware/validate');
const vendorOrderSchema = require('../schemas/vendorOrder.schema');

router.use(authenticate);
router.use(authorize('vendor', 'admin', 'super_admin'));

router.get('/orders',        validate(vendorOrderSchema.getVendorOrdersQuery, 'query'), vendorOrderController.getVendorOrders);
router.get('/dashboard/stats', vendorOrderController.getVendorDashboardStats);
router.get('/orders/:id',    vendorOrderController.getVendorOrderById);
router.put('/orders/:id/accept',   vendorOrderController.acceptOrder);
router.put('/orders/:id/ship',     validate(vendorOrderSchema.shipOrder),        vendorOrderController.shipOrder);
router.put('/orders/:id/deliver',  vendorOrderController.markAsDelivered);
router.put('/orders/:id/tracking', validate(vendorOrderSchema.updateTracking),   vendorOrderController.updateTracking);
router.post('/orders/:id/notes',   validate(vendorOrderSchema.addVendorNote),    vendorOrderController.addVendorNote);

module.exports = router;