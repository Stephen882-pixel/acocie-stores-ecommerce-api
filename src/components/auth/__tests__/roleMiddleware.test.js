const {
    authorize,
    authorizeMinRole,
    isCustomer,
    isVendor,
    isVendorOrAdmin,
    isAdmin,
    isSuperAdmin
} = require('../middleware/roleMiddleware');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Runs a middleware and reports whether it let the request through, plus the status it set.
const run = (middleware, user) => {
    const req = user === undefined ? {} : { user };
    const res = mockRes();
    const next = jest.fn();
    middleware(req, res, next);
    return { passed: next.mock.calls.length === 1, status: res.status.mock.calls[0]?.[0], res };
};

describe('roleMiddleware', () => {
    describe('authorize', () => {
        it('lets an allowed role through', () => {
            expect(run(authorize('admin', 'vendor'), { role: 'vendor' }).passed).toBe(true);
        });

        it('returns 403 with required and actual roles for a disallowed role', () => {
            const { passed, status, res } = run(authorize('admin'), { role: 'customer' });

            expect(passed).toBe(false);
            expect(status).toBe(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                requiredRoles: ['admin'],
                yourRole: 'customer'
            }));
        });

        it('returns 401 when req.user is missing', () => {
            expect(run(authorize('admin'))).toMatchObject({ passed: false, status: 401 });
        });
    });

    describe('authorizeMinRole', () => {
        it.each([
            ['super_admin', 'admin', true],
            ['admin', 'admin', true],
            ['vendor', 'admin', false],
            ['customer', 'vendor', false],
            ['vendor', 'customer', true],
            ['vendor_pending', 'customer', false]
        ])('%s against minimum %s → allowed: %s', (role, minRole, allowed) => {
            expect(run(authorizeMinRole(minRole), { role }).passed).toBe(allowed);
        });

        it('treats an unknown role as the lowest level', () => {
            expect(run(authorizeMinRole('customer'), { role: 'hacker' })).toMatchObject({ passed: false, status: 403 });
        });

        it('returns 401 when req.user is missing', () => {
            expect(run(authorizeMinRole('customer'))).toMatchObject({ passed: false, status: 401 });
        });
    });

    describe('preset guards', () => {
        const ROLES = ['customer', 'vendor_pending', 'vendor', 'admin', 'super_admin'];

        it.each([
            ['isCustomer', isCustomer, ['customer', 'vendor_pending']],
            ['isVendor', isVendor, ['vendor']],
            ['isVendorOrAdmin', isVendorOrAdmin, ['vendor', 'admin', 'super_admin']],
            ['isAdmin', isAdmin, ['admin', 'super_admin']],
            ['isSuperAdmin', isSuperAdmin, ['super_admin']]
        ])('%s allows exactly %p', (_, guard, allowed) => {
            const passing = ROLES.filter((role) => run(guard, { role }).passed);
            expect(passing).toEqual(allowed);
        });
    });
});
