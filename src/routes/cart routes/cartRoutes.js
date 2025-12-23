const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../../middleware/authMiddleware');

const optionalAuth = (req,res,next) => {
    const authHeader = req.headers?.authorization;

    if(authHeader&& authHeader.startsWith('Bearer ')){
        return authenticate(req,res,next);
    }

    next();
};

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, cartController.addToCart);
router.delete('/clear', optionalAuth, cartController.clearCart);
router.get('/validate', optionalAuth, cartController.validateCart);
router.post('/merge', authenticate, cartController.mergeCarts);
router.put('/items/:id', optionalAuth, cartController.updateCartItem);
router.delete('/items/:id', optionalAuth, cartController.removeCartItem);

module.exports = router;

