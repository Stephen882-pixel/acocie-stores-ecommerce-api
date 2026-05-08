/**
 * Vendor Order Schemas (DTOs)
 */

const Joi = require('joi');

/**
 * GET /vendor/orders  (query params)
 */
const getVendorOrdersQuery = Joi.object({
    page:      Joi.number().integer().min(1).default(1).label('Page'),
    limit:     Joi.number().integer().min(1).max(100).default(20).label('Limit'),
    status:    Joi.string()
                   .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
                   .optional()
                   .label('Status'),
    startDate: Joi.date().iso().optional().label('Start date'),
    endDate:   Joi.date().iso().optional().label('End date')
});

/**
 * PUT /vendor/orders/:id/ship
 */
const shipOrder = Joi.object({
    carrier:          Joi.string().trim().min(2).max(100).required().label('Carrier'),
    trackingNumber:   Joi.string().trim().min(2).max(100).required().label('Tracking number'),
    trackingUrl:      Joi.string().uri().optional().allow(null, '').label('Tracking URL'),
    estimatedDelivery: Joi.date().iso().optional().allow(null).label('Estimated delivery')
});

/**
 * PUT /vendor/orders/:id/tracking
 */
const updateTracking = Joi.object({
    currentLocation:  Joi.string().trim().max(255).optional().allow(null, '').label('Current location'),
    trackingStatus:   Joi.string()
                          .valid('pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed')
                          .optional()
                          .label('Tracking status'),
    estimatedDelivery: Joi.date().iso().optional().allow(null).label('Estimated delivery')
}).min(1).messages({ 'object.min': 'At least one tracking field must be provided' });

/**
 * POST /vendor/orders/:id/notes
 */
const addVendorNote = Joi.object({
    content:             Joi.string().trim().min(1).max(1000).required().label('Content'),
    isVisibleToCustomer: Joi.boolean().default(true).label('Visible to customer')
});

module.exports = { getVendorOrdersQuery, shipOrder, updateTracking, addVendorNote };
