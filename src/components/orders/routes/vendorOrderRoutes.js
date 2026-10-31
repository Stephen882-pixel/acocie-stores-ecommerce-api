const express = require('express');
const router = express.Router();
const vendorOrderController = require('../controllers/vendorOrderController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../rbac/middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const validate = require('../../../middleware/validate');
const vendorOrderSchema = require('../schemas/vendorOrder.schema');

router.use(authenticate);

const canReadOrders = requirePermission(P.VENDOR_ORDER_READ_OWN, P.VENDOR_ORDER_READ_ANY);
const canFulfil = requirePermission(P.VENDOR_ORDER_FULFIL_OWN);

router.get('/orders',        canReadOrders, validate(vendorOrderSchema.getVendorOrdersQuery, 'query'), vendorOrderController.getVendorOrders);
router.get('/dashboard/stats', requirePermission(P.VENDOR_DASHBOARD_READ), vendorOrderController.getVendorDashboardStats);
router.get('/orders/:id',    canReadOrders, vendorOrderController.getVendorOrderById);
router.put('/orders/:id/accept',   canFulfil, vendorOrderController.acceptOrder);
router.put('/orders/:id/ship',     canFulfil, validate(vendorOrderSchema.shipOrder),        vendorOrderController.shipOrder);
router.put('/orders/:id/deliver',  canFulfil, vendorOrderController.markAsDelivered);
router.put('/orders/:id/tracking', canFulfil, validate(vendorOrderSchema.updateTracking),   vendorOrderController.updateTracking);
router.post('/orders/:id/notes',   requirePermission(P.VENDOR_ORDER_NOTE_OWN), validate(vendorOrderSchema.addVendorNote),    vendorOrderController.addVendorNote);

module.exports = router;