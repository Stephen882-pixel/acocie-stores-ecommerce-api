jest.mock('../services/permissionService', () => {
    const { can } = jest.requireActual('../services/permissionService');
    return { can, getRolePermissions: jest.fn() };
});

const { requirePermission } = require('../middleware/rbacMiddleware');
const permissionService = require('../services/permissionService');
const { PERMISSIONS: P } = require('../constants/permissions');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const run = async (middleware, user) => {
    const req = { user, method: 'PUT', originalUrl: '/x' };
    const res = mockRes();
    const next = jest.fn();
    await middleware(req, res, next);
    return { req, passed: next.mock.calls.length === 1, status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] };
};

describe('requirePermission', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('throws when the routes load with an unknown key', () => {
        expect(() => requirePermission('product:fly')).toThrow(/unknown permission/);
        expect(() => requirePermission()).toThrow(/unknown permission/);
    });

    it('returns 401 without a user', async () => {
        const { passed, status } = await run(requirePermission(P.PRODUCT_CREATE), undefined);
        expect(passed).toBe(false);
        expect(status).toBe(401);
    });

    it('lets the request through when the role has one of the keys', async () => {
        permissionService.getRolePermissions.mockResolvedValue(new Set([P.PRODUCT_UPDATE_OWN]));

        const { passed, req } = await run(
            requirePermission(P.PRODUCT_UPDATE_OWN, P.PRODUCT_UPDATE_ANY),
            { userId: 'u1', role: 'vendor' }
        );

        expect(passed).toBe(true);
        expect(permissionService.getRolePermissions).toHaveBeenCalledWith('vendor');
        expect(req.user.permissions.has(P.PRODUCT_UPDATE_OWN)).toBe(true);
    });

    it('lets the wildcard through', async () => {
        permissionService.getRolePermissions.mockResolvedValue(new Set(['*']));
        const { passed } = await run(requirePermission(P.ORDER_REFUND), { userId: 'u1', role: 'super_admin' });
        expect(passed).toBe(true);
    });

    it('returns 403 without leaking the required permissions', async () => {
        permissionService.getRolePermissions.mockResolvedValue(new Set([P.CHECKOUT_PLACE_ORDER]));

        const { passed, status, body } = await run(requirePermission(P.CATEGORY_CREATE), { userId: 'u1', role: 'customer' });

        expect(passed).toBe(false);
        expect(status).toBe(403);
        expect(body).toEqual({ error: 'Access denied' });
    });

    it('reuses permissions already on req.user', async () => {
        const { passed } = await run(requirePermission(P.CATEGORY_CREATE), {
            userId: 'u1', role: 'admin', permissions: new Set([P.CATEGORY_CREATE])
        });

        expect(passed).toBe(true);
        expect(permissionService.getRolePermissions).not.toHaveBeenCalled();
    });

    it('fails closed with 500 when the lookup fails', async () => {
        permissionService.getRolePermissions.mockRejectedValue(new Error('db down'));

        const { passed, status } = await run(requirePermission(P.CATEGORY_CREATE), { userId: 'u1', role: 'admin' });

        expect(passed).toBe(false);
        expect(status).toBe(500);
    });
});
