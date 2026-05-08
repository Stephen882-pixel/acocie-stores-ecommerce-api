const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../../auth/middleware/authMiddleware');
const validate = require('../../../middleware/validate');
const cartSchema = require('../schemas/cart.schema');

const optionalAuth = (req,res,next) => {
    const authHeader = req.headers?.authorization;

    if(authHeader&& authHeader.startsWith('Bearer ')){
        return authenticate(req,res,next);
    }

    next();
};

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, validate(cartSchema.addToCart),       cartController.addToCart);
router.delete('/clear', optionalAuth, cartController.clearCart);
router.get('/validate', optionalAuth, cartController.validateCart);
router.post('/merge', authenticate, validate(cartSchema.mergeCarts),      cartController.mergeCarts);
router.put('/items/:id', optionalAuth, validate(cartSchema.updateCartItem), cartController.updateCartItem);
router.delete('/items/:id', optionalAuth, cartController.removeCartItem);

module.exports = router;

