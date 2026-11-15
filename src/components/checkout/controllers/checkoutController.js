'use strict';

const checkoutService = require('../services/checkoutService');
const { sendSuccess } = require('../../../helpers/response.helper');

const initiateCheckout = async (req, res) => {
    const result = await checkoutService.initiateCheckout(req.user.userId);
    return sendSuccess(res, result, { message: 'Cart is ready for checkout' });
};

const getCheckoutSummary = async (req, res) => {
    const summary = await checkoutService.getCheckoutSummary(req.user.userId, req.query.shippingAddressId);
    return sendSuccess(res, summary);
};

const placeOrder = async (req, res) => {
    const result = await checkoutService.placeOrder(req.user.userId, req.body);
    const message = result.orders.length > 1
        ? `${result.orders.length} orders placed, one per seller`
        : 'Order placed successfully';
    return sendSuccess(res, result, { statusCode: 201, message });
};

module.exports = {
    initiateCheckout,
    getCheckoutSummary,
    placeOrder
};
