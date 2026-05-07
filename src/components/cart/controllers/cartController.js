'use strict';

const cartService = require('../services/cartService');

const handleError = (res, error) => {
    console.error('[CartController]', error.message);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
        ...(error.availableStock !== undefined && { availableStock: error.availableStock }),
        ...(error.details && { details: error.details })
    });
};

const getCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];
        const cart = await cartService.getCart(userId, sessionId);
        return res.json({ cart });
    } catch (error) {
        return handleError(res, error);
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];
        const result = await cartService.addToCart(req.body, userId, sessionId);
        return res.status(201).json({ message: 'Item added to cart', ...result });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateCartItem = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];
        const cartItem = await cartService.updateCartItem(req.params.id, req.body.quantity, userId, sessionId);
        return res.json({ message: 'Cart item updated', cartItem });
    } catch (error) {
        return handleError(res, error);
    }
};

const removeCartItem = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];
        await cartService.removeCartItem(req.params.id, userId, sessionId);
        return res.json({ message: 'Item removed from cart' });
    } catch (error) {
        return handleError(res, error);
    }
};

const clearCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];
        await cartService.clearCart(userId, sessionId);
        return res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        return handleError(res, error);
    }
};

const validateCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const sessionId = req.headers['x-session-id'];
        const validation = await cartService.validateCart(userId, sessionId);
        return res.json(validation);
    } catch (error) {
        return handleError(res, error);
    }
};

const mergeCarts = async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await cartService.mergeCarts(userId, req.body.guestSessionId);
        return res.json(
            result.merged
                ? { message: 'Carts merged successfully' }
                : { message: 'No guest cart to merge' }
        );
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    validateCart,
    mergeCarts
};
