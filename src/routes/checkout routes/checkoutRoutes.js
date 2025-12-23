const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const authenticate = require('../../middleware/authMiddleware');


router.use(authenticate);
router.post('/initiate', checkoutController.initiateCheckout);
router.get('/summary', checkoutController.getCheckoutSummary);
router.post('/place-order', checkoutController.placeOrder);

module.exports = router;