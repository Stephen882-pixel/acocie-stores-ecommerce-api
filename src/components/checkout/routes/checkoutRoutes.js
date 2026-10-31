const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../rbac/middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const validate = require('../../../middleware/validate');
const checkoutSchema = require('../schemas/checkout.schema');

router.use(authenticate);
router.use(requirePermission(P.CHECKOUT_PLACE_ORDER));

router.post('/initiate', checkoutController.initiateCheckout);
router.get('/summary',   validate(checkoutSchema.getCheckoutSummaryQuery, 'query'), checkoutController.getCheckoutSummary);
router.post('/place-order', validate(checkoutSchema.placeOrder), checkoutController.placeOrder);

module.exports = router;