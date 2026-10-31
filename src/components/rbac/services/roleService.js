const { sequelize, Role, Permission } = require('../../../models');
const { PERMISSIONS } = require('../constants/permissions');
const permissionService = require('./permissionService');
const auditService = require('./auditService');

const { createError } = require('../../../helpers/error.helper');

const withPermissions = {
    include: [{ model: Permission, as: 'permissions', attributes: ['key'], through: { attributes: [] } }]
};

const toDto = (role) => ({
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((p) => p.key)
});

const listRoles = async () => {
    const roles = await Role.findAll({ ...withPermissions, order: [['name', 'ASC']] });
    return { roles: roles.map(toDto) };
};

const getRole = async (id) => {
    const role = await Role.findByPk(id, withPermissions);
    if (!role) throw createError('Role not found', 404);
    return { role: toDto(role) };
};

const setRolePermissions = async (id, keys, actor) => {
    const role = await Role.findByPk(id, withPermissions);
    if (!role) throw createError('Role not found', 404);

    if (role.name === 'super_admin') {
        throw createError('The super admin role cannot be changed', 403);
    }

    const before = role.permissions.map((p) => p.key);

    const added = keys.filter((key) => !before.includes(key));
    if (added.some((key) => !permissionService.can(actor, key))) {
        throw createError('You cannot grant permissions that you do not have', 403);
    }

    if (role.name === actor.role && before.includes(PERMISSIONS.ROLE_MANAGE) && !keys.includes(PERMISSIONS.ROLE_MANAGE)) {
        throw createError(`You cannot remove ${PERMISSIONS.ROLE_MANAGE} from your own role`, 403);
    }

    await sequelize.transaction(async (transaction) => {
        const permissions = await Permission.findAll({ where: { key: keys }, transaction });
        await role.setPermissions(permissions, { transaction });
        await auditService.record({
            actorId: actor.userId,
            action: 'role.permissions.update',
            targetType: 'role',
            targetId: role.id,
            before: { permissions: before },
            after: { permissions: keys }
        }, transaction);
    });

    permissionService.clearCache(role.name);
    return getRole(id);
};

module.exports = { listRoles, getRole, setRolePermissions };
