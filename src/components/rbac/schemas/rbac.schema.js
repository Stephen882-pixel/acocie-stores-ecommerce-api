/**
 * RBAC Schemas (DTOs)
 */

const Joi = require('joi');
const { PERMISSIONS } = require('../constants/permissions');

/**
 * PUT /rbac/roles/:id/permissions
 */
const setRolePermissions = Joi.object({
    permissions: Joi.array()
        .items(Joi.string().valid(...Object.values(PERMISSIONS)))
        .unique()
        .required()
        .label('Permissions')
});

/**
 * PUT /rbac/users/:userId/role
 */
const changeUserRole = Joi.object({
    role: Joi.string().trim().max(50).required().label('Role')
});

/**
 * GET /rbac/audit-logs  (query params)
 */
const getAuditLogsQuery = Joi.object({
    page:  Joi.number().integer().min(1).default(1).label('Page'),
    limit: Joi.number().integer().min(1).max(100).default(20).label('Limit')
});

module.exports = { setRolePermissions, changeUserRole, getAuditLogsQuery };
