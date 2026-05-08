/**
 * Admin Schemas (DTOs)
 * Covers admin user-management write endpoints and query filters.
 */

const Joi = require('joi');

// ─── Query filters ────────────────────────────────────────────────────────────

/**
 * GET /admin/users  (query params)
 */
const getUsersQuery = Joi.object({
    page:   Joi.number().integer().min(1).default(1).label('Page'),
    limit:  Joi.number().integer().min(1).max(100).default(20).label('Limit'),
    role:   Joi.string().valid('customer', 'vendor', 'admin', 'super_admin').optional().label('Role'),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional().label('Status'),
    search: Joi.string().trim().max(100).optional().allow('').label('Search')
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

/**
 * PUT /admin/users/:id/status
 */
const updateUserStatus = Joi.object({
    status: Joi.string()
        .valid('active', 'inactive', 'suspended')
        .required()
        .label('Status')
});

/**
 * PUT /admin/users/:id/role
 */
const updateUserRole = Joi.object({
    role: Joi.string()
        .valid('customer', 'vendor', 'admin')
        .required()
        .label('Role')
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { getUsersQuery, updateUserStatus, updateUserRole };
