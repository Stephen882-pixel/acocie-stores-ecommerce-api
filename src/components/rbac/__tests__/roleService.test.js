jest.mock('../../../models', () => ({
    sequelize: { transaction: jest.fn() },
    Role: { findByPk: jest.fn(), findAll: jest.fn() },
    Permission: { findAll: jest.fn() }
}));
jest.mock('../services/auditService', () => ({ record: jest.fn() }));
jest.mock('../services/permissionService', () => {
    const { can } = jest.requireActual('../services/permissionService');
    return { can, clearCache: jest.fn() };
});

const { sequelize, Role, Permission } = require('../../../models');
const permissionService = require('../services/permissionService');
const auditService = require('../services/auditService');
const roleService = require('../services/roleService');
const { PERMISSIONS: P } = require('../constants/permissions');

const mockRole = (name, keys) => {
    const role = {
        id: `role-${name}`, name, displayName: name, description: null, isSystem: true,
        permissions: keys.map((key) => ({ key })),
        setPermissions: jest.fn()
    };
    Role.findByPk.mockResolvedValue(role);
    return role;
};

const superAdmin = { userId: 'sa-1', role: 'super_admin', permissions: new Set(['*']) };

describe('roleService.setRolePermissions', () => {
    beforeEach(() => {
        sequelize.transaction.mockImplementation((fn) => fn('tx'));
        Permission.findAll.mockImplementation(async ({ where }) => where.key.map((key) => ({ key })));
    });

    it('replaces the permissions, writes the audit log and clears the cache', async () => {
        const role = mockRole('vendor', [P.PRODUCT_CREATE, P.PRODUCT_DELETE_OWN]);

        await roleService.setRolePermissions(role.id, [P.PRODUCT_CREATE], superAdmin);

        expect(role.setPermissions).toHaveBeenCalledWith([{ key: P.PRODUCT_CREATE }], { transaction: 'tx' });
        expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
            action: 'role.permissions.update',
            before: { permissions: [P.PRODUCT_CREATE, P.PRODUCT_DELETE_OWN] },
            after: { permissions: [P.PRODUCT_CREATE] }
        }), 'tx');
        expect(permissionService.clearCache).toHaveBeenCalledWith('vendor');
    });

    it('refuses to change the super admin role', async () => {
        mockRole('super_admin', ['*']);
        await expect(roleService.setRolePermissions('role-super_admin', [], superAdmin))
            .rejects.toMatchObject({ statusCode: 403 });
    });

    it('refuses to grant a permission the actor does not have', async () => {
        mockRole('vendor', []);
        const actor = { userId: 'a-1', role: 'manager', permissions: new Set([P.ROLE_MANAGE, P.PRODUCT_CREATE]) };

        await expect(roleService.setRolePermissions('role-vendor', [P.PRODUCT_CREATE, P.ORDER_REFUND], actor))
            .rejects.toMatchObject({ statusCode: 403 });
    });

    it('refuses to remove role:manage from the actor\'s own role', async () => {
        mockRole('manager', [P.ROLE_MANAGE]);
        const actor = { userId: 'a-1', role: 'manager', permissions: new Set([P.ROLE_MANAGE]) };

        await expect(roleService.setRolePermissions('role-manager', [], actor))
            .rejects.toMatchObject({ statusCode: 403 });
    });

    it('returns 404 for an unknown role', async () => {
        Role.findByPk.mockResolvedValue(null);
        await expect(roleService.setRolePermissions('nope', [], superAdmin)).rejects.toMatchObject({ statusCode: 404 });
    });
});
