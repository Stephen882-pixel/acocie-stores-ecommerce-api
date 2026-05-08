/**
 * Order Schemas (DTOs) — Customer-facing endpoints
 */

const Joi = require('joi');

/**
 * GET /orders  (query params)
 */
const getOrderHistoryQuery = Joi.object({
    page:      Joi.number().integer().min(1).default(1).label('Page'),
    limit:     Joi.number().integer().min(1).max(100).default(20).label('Limit'),
    status:    Joi.string()
                   .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
                   .optional()
                   .label('Status'),
    startDate: Joi.date().iso().optional().label('Start date'),
    endDate:   Joi.date().iso().min(Joi.ref('startDate')).optional().label('End date')
});

/**
 * POST /orders/:id/cancel
 */
const requestCancellation = Joi.object({
    reason: Joi.string().trim().min(5).max(500).required().label('Reason')
});

/**
 * POST /orders/:id/return
 */
const requestReturn = Joi.object({
    reason: Joi.string().trim().min(5).max(500).required().label('Reason')
});

/**
 * POST /orders/:id/notes
 */
const addCustomerNote = Joi.object({
    content: Joi.string().trim().min(1).max(1000).required().label('Content')
});

module.exports = { getOrderHistoryQuery, requestCancellation, requestReturn, addCustomerNote };
