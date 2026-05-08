/**
 * Checkout Schemas (DTOs)
 */

const Joi = require('joi');

/**
 * GET /checkout/summary  (query params)
 */
const getCheckoutSummaryQuery = Joi.object({
    shippingAddressId: Joi.string().uuid().optional().label('Shipping address ID')
});

/**
 * POST /checkout/place-order
 */
const placeOrder = Joi.object({
    shippingAddressId: Joi.string().uuid().required().label('Shipping address ID'),
    billingAddressId:  Joi.string().uuid().optional().allow(null).label('Billing address ID'),
    paymentMethod:     Joi.string()
                           .valid('cash_on_delivery', 'card', 'mobile_money', 'bank_transfer')
                           .default('cash_on_delivery')
                           .label('Payment method'),
    notes: Joi.string().trim().max(1000).optional().allow(null, '').label('Order notes')
});

module.exports = { getCheckoutSummaryQuery, placeOrder };
