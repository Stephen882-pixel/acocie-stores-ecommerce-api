const { sequelize, User, Role } = require('../../../models');
const { WILDCARD, PERMISSIONS } = require('../constants/permissions');
const permissionService = require('./permissionService');
const auditService = require('./auditService');

const { createError } = require('../../../helpers/error.helper');

// Permissions that give power over other users' access. An actor cannot
// assign a role that holds one of these unless the actor holds it too.
const GRANT_PERMISSIONS = [WILDCARD, PERMISSIONS.ROLE_MANAGE, PERMISSIONS.USER_ROLE_ASSIGN];

const getUserRole = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) throw createError('User not found', 404);

    const permissions = await permissionService.getRolePermissions(user.role);
    return {
        user: { id: user.id, email: user.email, role: user.role },
        permissions: [...permissions]
    };
};

const changeRole = async (userId, roleName, actor) => {
    if (userId === actor.userId) {
        throw createError('You cannot change your own role', 403);
    }

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) throw createError('Role not found', 404);

    const user = await User.findByPk(userId);
    if (!user) throw createError('User not found', 404);

    if ((roleName === 'super_admin' || user.role === 'super_admin') && !permissionService.can(actor, WILDCARD)) {
        throw createError('Only a super admin can assign or remove the super admin role', 403);
    }

    const rolePermissions = await permissionService.getRolePermissions(roleName);
    if (GRANT_PERMISSIONS.some((key) => rolePermissions.has(key) && !permissionService.can(actor, key))) {
        throw createError('You cannot assign a role with permissions that you do not have', 403);
    }

    if (user.role === 'super_admin' && roleName !== 'super_admin') {
        const superAdmins = await User.count({ where: { role: 'super_admin' } });
        if (superAdmins <= 1) throw createError('Cannot remove the last super admin', 400);
    }

    const before = user.role;
    await sequelize.transaction(async (transaction) => {
        await user.update({ role: roleName }, { transaction });
        await auditService.record({
            actorId: actor.userId,
            action: 'user.role.change',
            targetType: 'user',
            targetId: user.id,
            before: { role: before },
            after: { role: roleName }
        }, transaction);
    });

    return {
        message: `User role updated to ${roleName}`,
        user: { id: user.id, email: user.email, role: user.role }
    };
};

module.exports = { getUserRole, changeRole };
