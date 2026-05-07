'use strict';

const checkoutService = require('../services/checkoutService');

const handleError = (res, error) => {
    console.error('[CheckoutController]', error.message);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
        ...(error.details && { details: error.details })
    });
};

const initiateCheckout = async (req, res) => {
    try {
        const result = await checkoutService.initiateCheckout(req.user.userId);
        return res.json({ message: 'Checkout initiated, inventory reserved', ...result });
    } catch (error) {
        return handleError(res, error);
    }
};

const getCheckoutSummary = async (req, res) => {
    try {
        const summary = await checkoutService.getCheckoutSummary(req.user.userId, req.query.shippingAddressId);
        return res.json(summary);
    } catch (error) {
        return handleError(res, error);
    }
};

const placeOrder = async (req, res) => {
    try {
        const order = await checkoutService.placeOrder(req.user.userId, req.body);
        return res.status(201).json({ message: 'Order placed successfully', order });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    initiateCheckout,
    getCheckoutSummary,
    placeOrder
};
