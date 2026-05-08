/**
 * Admin Order Schemas (DTOs)
 */

const Joi = require('joi');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

/**
 * GET /admin/orders  (query params)
 */
const getAllOrdersQuery = Joi.object({
    page:          Joi.number().integer().min(1).default(1).label('Page'),
    limit:         Joi.number().integer().min(1).max(100).default(20).label('Limit'),
    status:        Joi.string().valid(...ORDER_STATUSES).optional().label('Status'),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional().label('Payment status'),
    userId:        Joi.string().uuid().optional().label('User ID'),
    vendorId:      Joi.string().uuid().optional().label('Vendor ID'),
    startDate:     Joi.date().iso().optional().label('Start date'),
    endDate:       Joi.date().iso().optional().label('End date'),
    minAmount:     Joi.number().positive().optional().label('Min amount'),
    maxAmount:     Joi.number().positive().optional().label('Max amount'),
    search:        Joi.string().trim().max(100).optional().allow('').label('Search')
});

/**
 * PUT /admin/orders/:id/status
 */
const updateOrderStatus = Joi.object({
    status: Joi.string().valid(...ORDER_STATUSES).required().label('Status'),
    reason: Joi.string().trim().max(500).optional().allow(null, '').label('Reason')
});

/**
 * PUT /admin/orders/:id/confirm
 */
const confirmOrder = Joi.object({
    paymentReference: Joi.string().trim().max(255).optional().allow(null, '').label('Payment reference')
});

/**
 * POST /admin/orders/:id/notes
 */
const addAdminNote = Joi.object({
    content:             Joi.string().trim().min(1).max(1000).required().label('Content'),
    isVisibleToCustomer: Joi.boolean().default(false).label('Visible to customer')
});

/**
 * PUT /admin/orders/cancellations/:id
 */
const processCancellation = Joi.object({
    action:     Joi.string().valid('approve', 'reject').required().label('Action'),
    adminNotes: Joi.string().trim().max(1000).optional().allow(null, '').label('Admin notes')
});

/**
 * PUT /admin/orders/returns/:id
 */
const processReturn = Joi.object({
    action:       Joi.string().valid('approve', 'reject').required().label('Action'),
    adminNotes:   Joi.string().trim().max(1000).optional().allow(null, '').label('Admin notes'),
    refundAmount: Joi.number().positive().precision(2).optional().allow(null).label('Refund amount')
});

/**
 * POST /admin/orders/:id/refund
 */
const processRefund = Joi.object({
    refundAmount:  Joi.number().positive().precision(2).optional().allow(null).label('Refund amount'),
    refundMethod:  Joi.string()
                       .valid('original_payment', 'bank_transfer', 'store_credit')
                       .default('original_payment')
                       .label('Refund method'),
    notes: Joi.string().trim().max(1000).optional().allow(null, '').label('Notes')
});

module.exports = {
    getAllOrdersQuery,
    updateOrderStatus,
    confirmOrder,
    addAdminNote,
    processCancellation,
    processReturn,
    processRefund
};
