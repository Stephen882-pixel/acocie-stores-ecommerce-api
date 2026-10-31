'use strict';

const checkoutService = require('../services/checkoutService');
const { sendSuccess } = require('../../../helpers/response.helper');

const initiateCheckout = async (req, res) => {
    const result = await checkoutService.initiateCheckout(req.user.userId);
    return sendSuccess(res, result, { message: 'Checkout initiated, inventory reserved' });
};

const getCheckoutSummary = async (req, res) => {
    const summary = await checkoutService.getCheckoutSummary(req.user.userId, req.query.shippingAddressId);
    return sendSuccess(res, summary);
};

const placeOrder = async (req, res) => {
    const order = await checkoutService.placeOrder(req.user.userId, req.body);
    return sendSuccess(res, order, { statusCode: 201, message: 'Order placed successfully' });
};

module.exports = {
    initiateCheckout,
    getCheckoutSummary,
    placeOrder
};
