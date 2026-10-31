const permissionService = require('../services/permissionService');
const roleService = require('../services/roleService');
const userRoleService = require('../services/userRoleService');
const auditService = require('../services/auditService');
const { sendSuccess } = require('../../../helpers/response.helper');

const listPermissions = (req, res) => sendSuccess(res, permissionService.listPermissions());

const listRoles = async (req, res) => {
    const { roles } = await roleService.listRoles();
    return sendSuccess(res, roles);
};

const getRole = async (req, res) => {
    const { role } = await roleService.getRole(req.params.id);
    return sendSuccess(res, role);
};

const setRolePermissions = async (req, res) => {
    const { role } = await roleService.setRolePermissions(req.params.id, req.body.permissions, req.user);
    return sendSuccess(res, role, { message: 'Role permissions updated' });
};

const getUserRole = async (req, res) => {
    const result = await userRoleService.getUserRole(req.params.userId);
    return sendSuccess(res, result);
};

const changeUserRole = async (req, res) => {
    const { message, user } = await userRoleService.changeRole(req.params.userId, req.body.role, req.user);
    return sendSuccess(res, user, { message });
};

const getMyPermissions = async (req, res) => {
    const permissions = await permissionService.getRolePermissions(req.user.role);
    return sendSuccess(res, { role: req.user.role, permissions: [...permissions] });
};

const listAuditLogs = async (req, res) => {
    const { logs, pagination } = await auditService.listAuditLogs(req.query);
    return sendSuccess(res, logs, { meta: { pagination } });
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
