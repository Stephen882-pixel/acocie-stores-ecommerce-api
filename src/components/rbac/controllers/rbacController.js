const permissionService = require('../services/permissionService');
const roleService = require('../services/roleService');
const userRoleService = require('../services/userRoleService');
const auditService = require('../services/auditService');

const handleError = (res, error) => {
    console.error(`[RbacController] ${error.message}`);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
};

const listPermissions = (req, res) => res.json(permissionService.listPermissions());

const listRoles = async (req, res) => {
    try {
        return res.json(await roleService.listRoles());
    } catch (error) {
        return handleError(res, error);
    }
};

const getRole = async (req, res) => {
    try {
        return res.json(await roleService.getRole(req.params.id));
    } catch (error) {
        return handleError(res, error);
    }
};

const setRolePermissions = async (req, res) => {
    try {
        return res.json(await roleService.setRolePermissions(req.params.id, req.body.permissions, req.user));
    } catch (error) {
        return handleError(res, error);
    }
};

const getUserRole = async (req, res) => {
    try {
        return res.json(await userRoleService.getUserRole(req.params.userId));
    } catch (error) {
        return handleError(res, error);
    }
};

const changeUserRole = async (req, res) => {
    try {
        return res.json(await userRoleService.changeRole(req.params.userId, req.body.role, req.user));
    } catch (error) {
        return handleError(res, error);
    }
};

const getMyPermissions = async (req, res) => {
    try {
        const permissions = await permissionService.getRolePermissions(req.user.role);
        return res.json({ role: req.user.role, permissions: [...permissions] });
    } catch (error) {
        return handleError(res, error);
    }
};

const listAuditLogs = async (req, res) => {
    try {
        return res.json(await auditService.listAuditLogs(req.query));
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    listPermissions,
    listRoles,
    getRole,
    setRolePermissions,
    getUserRole,
    changeUserRole,
    getMyPermissions,
    listAuditLogs
};
