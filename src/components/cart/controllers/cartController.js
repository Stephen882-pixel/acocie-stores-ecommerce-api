'use strict';

const cartService = require('../services/cartService');
const { sendSuccess } = require('../../../helpers/response.helper');

const getCart = async (req, res) => {
    const cart = await cartService.getCart(req.user?.userId, req.headers['x-session-id']);
    return sendSuccess(res, cart);
};

const addToCart = async (req, res) => {
    const result = await cartService.addToCart(req.body, req.user?.userId, req.headers['x-session-id']);
    return sendSuccess(res, result, { statusCode: 201, message: 'Item added to cart' });
};

const updateCartItem = async (req, res) => {
    const cartItem = await cartService.updateCartItem(
        req.params.id, req.body.quantity, req.user?.userId, req.headers['x-session-id']
    );
    return sendSuccess(res, cartItem, { message: 'Cart item updated' });
};

const removeCartItem = async (req, res) => {
    await cartService.removeCartItem(req.params.id, req.user?.userId, req.headers['x-session-id']);
    return sendSuccess(res, null, { message: 'Item removed from cart' });
};

const clearCart = async (req, res) => {
    await cartService.clearCart(req.user?.userId, req.headers['x-session-id']);
    return sendSuccess(res, null, { message: 'Cart cleared successfully' });
};

const validateCart = async (req, res) => {
    const validation = await cartService.validateCart(req.user?.userId, req.headers['x-session-id']);
    return sendSuccess(res, validation);
};

const mergeCarts = async (req, res) => {
    const { merged } = await cartService.mergeCarts(req.user.userId, req.body.guestSessionId);
    return sendSuccess(res, { merged }, {
        message: merged ? 'Carts merged successfully' : 'No guest cart to merge'
    });
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
