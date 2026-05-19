const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { isCustomer } = require('../../auth/middleware/roleMiddleware');
const validate = require('../../../middleware/validate');
const checkoutSchema = require('../schemas/checkout.schema');

router.use(authenticate);
router.use(isCustomer);

router.post('/initiate', checkoutController.initiateCheckout);
router.get('/summary',   validate(checkoutSchema.getCheckoutSummaryQuery, 'query'), checkoutController.getCheckoutSummary);
router.post('/place-order', validate(checkoutSchema.placeOrder), checkoutController.placeOrder);

module.exports = router;