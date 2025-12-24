const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order controllers/orderController');
const authenticate = require('../../middleware/authMiddleware');

router.use(authenticate);

router.get('/',orderController.getOrderHistory);
router.get('/stats',orderController.getOrderStats);
router.get('/number/:orderNumber',orderController.getOrderByNumber);
router.get('/:id',orderController.getOrderById);
router.get('/:id/tracking',orderController.getOrderTracking);
router.post('/:id/cancel',orderController.requestOrderCancellation);
router.post('/:id/return',orderController.requestReturn);
router.post('/:id/notes',orderController.addCustomerNote);
module.exports = router;