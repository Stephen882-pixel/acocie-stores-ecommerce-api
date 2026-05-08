const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../../auth/middleware/authMiddleware');
const validate = require('../../../middleware/validate');
const orderSchema = require('../schemas/order.schema');

router.use(authenticate);

router.get('/',     validate(orderSchema.getOrderHistoryQuery, 'query'), orderController.getOrderHistory);
router.get('/stats', orderController.getOrderStats);
router.get('/number/:orderNumber', orderController.getOrderByNumber);
router.get('/:id',  orderController.getOrderById);
router.get('/:id/tracking', orderController.getOrderTracking);
router.post('/:id/cancel', validate(orderSchema.requestCancellation), orderController.requestOrderCancellation);
router.post('/:id/return', validate(orderSchema.requestReturn),       orderController.requestReturn);
router.post('/:id/notes',  validate(orderSchema.addCustomerNote),     orderController.addCustomerNote);

module.exports = router;