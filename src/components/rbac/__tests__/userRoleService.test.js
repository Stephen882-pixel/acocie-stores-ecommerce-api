jest.mock('../../../models', () => ({
    sequelize: { transaction: jest.fn() },
    User: { findByPk: jest.fn(), count: jest.fn() },
    Role: { findOne: jest.fn() }
}));
jest.mock('../services/auditService', () => ({ record: jest.fn() }));
jest.mock('../services/permissionService', () => {
    const { can } = jest.requireActual('../services/permissionService');
    const { DEFAULT_ROLE_PERMISSIONS } = jest.requireActual('../constants/permissions');
    return { can, getRolePermissions: async (role) => new Set(DEFAULT_ROLE_PERMISSIONS[role] || []) };
});

const { sequelize, User, Role } = require('../../../models');
const auditService = require('../services/auditService');
const userRoleService = require('../services/userRoleService');
const { DEFAULT_ROLE_PERMISSIONS } = require('../constants/permissions');

const actorWith = (role, userId = 'actor-1') => ({ userId, role, permissions: new Set(DEFAULT_ROLE_PERMISSIONS[role]) });

const mockUser = (role) => {
    const user = { id: 'user-1', email: 'jane@example.com', role };
    user.update = jest.fn(async ({ role: next }) => { user.role = next; });
    User.findByPk.mockResolvedValue(user);
    return user;
};

describe('userRoleService.changeRole', () => {
    beforeEach(() => {
        sequelize.transaction.mockImplementation((fn) => fn('tx'));
        Role.findOne.mockImplementation(async ({ where }) => ({ id: `role-${where.name}`, name: where.name }));
    });

    it('lets an admin approve a vendor and writes the audit log', async () => {
        const user = mockUser('vendor_pending');

        const result = await userRoleService.changeRole('user-1', 'vendor', actorWith('admin'));

        expect(result.user.role).toBe('vendor');
        expect(user.update).toHaveBeenCalledWith({ role: 'vendor' }, { transaction: 'tx' });
        expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
            actorId: 'actor-1', action: 'user.role.change', before: { role: 'vendor_pending' }, after: { role: 'vendor' }
        }), 'tx');
    });

    it('lets an admin make another admin', async () => {
        mockUser('customer');
        await expect(userRoleService.changeRole('user-1', 'admin', actorWith('admin'))).resolves.toBeDefined();
    });

    it('refuses to change your own role', async () => {
        await expect(userRoleService.changeRole('actor-1', 'customer', actorWith('admin')))
            .rejects.toMatchObject({ statusCode: 403 });
    });

    it('returns 404 for an unknown role', async () => {
        Role.findOne.mockResolvedValue(null);
        await expect(userRoleService.changeRole('user-1', 'pirate', actorWith('admin')))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    it.each([
        ['assign', 'customer', 'super_admin'],
        ['remove', 'super_admin', 'customer']
    ])('refuses to let an admin %s super_admin', async (_, from, to) => {
        mockUser(from);
        await expect(userRoleService.changeRole('user-1', to, actorWith('admin')))
            .rejects.toMatchObject({ statusCode: 403 });
    });

    it('refuses to remove the last super admin', async () => {
        mockUser('super_admin');
        User.count.mockResolvedValue(1);

        await expect(userRoleService.changeRole('user-1', 'admin', actorWith('super_admin')))
            .rejects.toMatchObject({ statusCode: 400, message: 'Cannot remove the last super admin' });
    });

    it('lets a super admin demote a super admin when another one exists', async () => {
        mockUser('super_admin');
        User.count.mockResolvedValue(2);

        const result = await userRoleService.changeRole('user-1', 'admin', actorWith('super_admin'));
        expect(result.user.role).toBe('admin');
    });
});
