const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../rbac/middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const validate = require('../../../middleware/validate');
const orderSchema = require('../schemas/order.schema');

router.use(authenticate);

router.get('/',     requirePermission(P.ORDER_READ_OWN), validate(orderSchema.getOrderHistoryQuery, 'query'), orderController.getOrderHistory);
router.get('/stats', requirePermission(P.ORDER_READ_OWN), orderController.getOrderStats);
router.get('/number/:orderNumber', requirePermission(P.ORDER_READ_OWN), orderController.getOrderByNumber);
router.get('/:id',  requirePermission(P.ORDER_READ_OWN), orderController.getOrderById);
router.get('/:id/tracking', requirePermission(P.ORDER_READ_OWN), orderController.getOrderTracking);
router.post('/:id/cancel', requirePermission(P.ORDER_CANCEL_OWN), validate(orderSchema.requestCancellation), orderController.requestOrderCancellation);
router.post('/:id/return', requirePermission(P.ORDER_RETURN_OWN), validate(orderSchema.requestReturn),       orderController.requestReturn);
router.post('/:id/notes',  requirePermission(P.ORDER_NOTE_OWN), validate(orderSchema.addCustomerNote),     orderController.addCustomerNote);

module.exports = router;