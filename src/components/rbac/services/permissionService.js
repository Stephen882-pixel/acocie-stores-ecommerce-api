const { sequelize, Role, Permission, RolePermission } = require('../../../models');
const { WILDCARD, PERMISSIONS, GROUPS, DEFAULT_ROLE_PERMISSIONS } = require('../constants/permissions');

const ALL_KEYS = [...Object.values(PERMISSIONS), WILDCARD];

// Role name -> { permissions: Set<string>, expiresAt }. Other server instances
// see a permission change when their entry expires.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

const can = (actor, key) => Boolean(actor?.permissions?.has(WILDCARD) || actor?.permissions?.has(key));

const getRolePermissions = async (roleName) => {
    const cached = cache.get(roleName);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;

    const role = await Role.findOne({
        where: { name: roleName },
        include: [{ model: Permission, as: 'permissions', attributes: ['key'], through: { attributes: [] } }]
    });

    const permissions = new Set(role ? role.permissions.map((p) => p.key) : []);
    cache.set(roleName, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
    return permissions;
};

const clearCache = (roleName) => cache.delete(roleName);

const listPermissions = () => ({ permissions: Object.values(PERMISSIONS), groups: GROUPS });

/**
 * Inserts permissions that exist in code but not in the database, and gives
 * each new permission to its default roles. Existing role permissions are
 * never changed, so edits made through the API are kept.
 */
const syncPermissions = async () => {
    const existing = new Set((await Permission.findAll({ attributes: ['key'] })).map((p) => p.key));
    const newKeys = ALL_KEYS.filter((key) => !existing.has(key));
    if (newKeys.length === 0) return;

    await sequelize.transaction(async (transaction) => {
        await Permission.bulkCreate(
            newKeys.map((key) => ({ key, resource: key.split(':')[0] })),
            { transaction, ignoreDuplicates: true }
        );

        // Read back the rows: another instance may have inserted some of them first.
        const created = await Permission.findAll({ where: { key: newKeys }, transaction });
        const roles = await Role.findAll({ transaction });

        const links = roles.flatMap((role) => created
            .filter((permission) => DEFAULT_ROLE_PERMISSIONS[role.name]?.includes(permission.key))
            .map((permission) => ({ roleId: role.id, permissionId: permission.id })));

        await RolePermission.bulkCreate(links, { transaction, ignoreDuplicates: true });
    });

    console.log(`  RBAC: synced ${newKeys.length} new permission(s)`);
};

module.exports = {
    can,
    getRolePermissions,
    clearCache,
    listPermissions,
    syncPermissions
};
