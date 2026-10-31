jest.mock('../../../models', () => ({
    sequelize: { transaction: jest.fn((fn) => fn('tx')) },
    Role: { findOne: jest.fn(), findAll: jest.fn() },
    Permission: { findAll: jest.fn(), bulkCreate: jest.fn() },
    RolePermission: { bulkCreate: jest.fn() }
}));

const { sequelize, Role, Permission, RolePermission } = require('../../../models');
const permissionService = require('../services/permissionService');
const { PERMISSIONS: P } = require('../constants/permissions');

describe('permissionService', () => {
    beforeEach(() => {
        sequelize.transaction.mockImplementation((fn) => fn('tx'));
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    describe('can', () => {
        it('checks the key or the wildcard', () => {
            expect(permissionService.can({ permissions: new Set([P.ROLE_READ]) }, P.ROLE_READ)).toBe(true);
            expect(permissionService.can({ permissions: new Set([P.ROLE_READ]) }, P.ROLE_MANAGE)).toBe(false);
            expect(permissionService.can({ permissions: new Set(['*']) }, P.ROLE_MANAGE)).toBe(true);
            expect(permissionService.can(undefined, P.ROLE_READ)).toBe(false);
        });
    });

    describe('getRolePermissions', () => {
        it('reads the role once, then serves it from the cache until cleared', async () => {
            Role.findOne.mockResolvedValue({ permissions: [{ key: P.ROLE_READ }] });

            const first = await permissionService.getRolePermissions('cache-test');
            await permissionService.getRolePermissions('cache-test');
            expect(first).toEqual(new Set([P.ROLE_READ]));
            expect(Role.findOne).toHaveBeenCalledTimes(1);

            permissionService.clearCache('cache-test');
            await permissionService.getRolePermissions('cache-test');
            expect(Role.findOne).toHaveBeenCalledTimes(2);
        });

        it('returns an empty set for an unknown role', async () => {
            Role.findOne.mockResolvedValue(null);
            expect(await permissionService.getRolePermissions('ghost')).toEqual(new Set());
        });
    });

    describe('syncPermissions', () => {
        it('does nothing when every permission exists', async () => {
            Permission.findAll.mockResolvedValue([...Object.values(P), '*'].map((key) => ({ key })));

            await permissionService.syncPermissions();

            expect(Permission.bulkCreate).not.toHaveBeenCalled();
        });

        it('inserts new permissions and gives them only to their default roles', async () => {
            const existing = [...Object.values(P), '*'].filter((k) => k !== P.CATEGORY_CREATE).map((key) => ({ key }));
            Permission.findAll
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce([{ id: 'perm-new', key: P.CATEGORY_CREATE }]);
            Role.findAll.mockResolvedValue([{ id: 'r-admin', name: 'admin' }, { id: 'r-vendor', name: 'vendor' }]);

            await permissionService.syncPermissions();

            expect(Permission.bulkCreate).toHaveBeenCalledWith(
                [{ key: P.CATEGORY_CREATE, resource: 'category' }],
                { transaction: 'tx', ignoreDuplicates: true }
            );
            expect(RolePermission.bulkCreate).toHaveBeenCalledWith(
                [{ roleId: 'r-admin', permissionId: 'perm-new' }],
                { transaction: 'tx', ignoreDuplicates: true }
            );
        });
    });
});
