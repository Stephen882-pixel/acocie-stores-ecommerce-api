/**
 * Cart Schemas (DTOs)
 */

const Joi = require('joi');

const uuid = Joi.string().uuid({ version: 'uuidv4' });

/**
 * POST /cart/items
 */
const addToCart = Joi.object({
    productId:  Joi.string().uuid().required().label('Product ID'),
    variantId:  Joi.string().uuid().optional().allow(null).label('Variant ID'),
    quantity:   Joi.number().integer().min(1).max(100).default(1).label('Quantity'),
    sessionId:  Joi.string().trim().max(100).optional().allow(null, '').label('Session ID')
});

/**
 * PUT /cart/items/:id
 */
const updateCartItem = Joi.object({
    quantity:  Joi.number().integer().min(1).max(100).required().label('Quantity'),
    sessionId: Joi.string().trim().max(100).optional().allow(null, '').label('Session ID')
});

/**
 * POST /cart/merge  (merge guest cart into authenticated cart)
 */
const mergeCarts = Joi.object({
    sessionId: Joi.string().trim().required().label('Session ID')
});

module.exports = { addToCart, updateCartItem, mergeCarts };
