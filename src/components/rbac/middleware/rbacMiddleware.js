const { PERMISSIONS } = require('../constants/permissions');
const permissionService = require('../services/permissionService');
const { sendError } = require('../../../helpers/response.helper');

const KNOWN_KEYS = new Set(Object.values(PERMISSIONS));

/**
 * requirePermission(...keys)
 * Allow the request if the user has ANY of the given permissions.
 * Must run after authenticate. An unknown key throws when the routes load.
 */
const requirePermission = (...keys) => {
    const unknown = keys.filter((key) => !KNOWN_KEYS.has(key));
    if (keys.length === 0 || unknown.length > 0) {
        throw new Error(`requirePermission: unknown permission(s): ${unknown.join(', ') || '(none given)'}`);
    }

    return async (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, 'Authentication required');
        }

        try {
            if (!req.user.permissions) {
                req.user.permissions = await permissionService.getRolePermissions(req.user.role);
            }
        } catch (error) {
            console.error('Error in requirePermission middleware:', error);
            return sendError(res, 500, 'Authorization failed');
        }

        if (!keys.some((key) => permissionService.can(req.user, key))) {
            console.warn(`[RBAC] Access denied: user=${req.user.userId} role=${req.user.role} ${req.method} ${req.originalUrl} needs ${keys.join(' | ')}`);
            return sendError(res, 403, 'Access denied');
        }

        next();
    };
};

module.exports = { requirePermission };
