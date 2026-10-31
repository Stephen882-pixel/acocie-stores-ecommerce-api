jest.mock('../../../models', () => ({
    User: { findByPk: jest.fn() }
}));

const { User } = require('../../../models');
const authUtils = require('../utils/authUtils');
const authenticate = require('../middleware/authMiddleware');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const reqWithAuth = (authorization) => ({ headers: authorization ? { authorization } : {} });

describe('authenticate middleware', () => {
    let res;
    let next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
    });

    it('attaches req.user and calls next for a valid token and active user', async () => {
        const token = authUtils.generateAccessToken('user-1', 'jane@example.com', 'vendor');
        User.findByPk.mockResolvedValue({ id: 'user-1', status: 'active', role: 'vendor' });
        const req = reqWithAuth(`Bearer ${token}`);

        await authenticate(req, res, next);

        expect(User.findByPk).toHaveBeenCalledWith('user-1');
        expect(req.user).toEqual({ userId: 'user-1', email: 'jane@example.com', role: 'vendor' });
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('takes the role from the database, not from the token', async () => {
        const token = authUtils.generateAccessToken('user-1', 'jane@example.com', 'admin');
        User.findByPk.mockResolvedValue({ id: 'user-1', status: 'active', role: 'customer' });
        const req = reqWithAuth(`Bearer ${token}`);

        await authenticate(req, res, next);

        expect(req.user.role).toBe('customer');
    });

    it.each([
        ['missing', undefined],
        ['not a Bearer scheme', 'Basic abc123'],
        ['lowercase bearer', 'bearer abc123']
    ])('returns 401 when the header is %s', async (_, header) => {
        await authenticate(reqWithAuth(header), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        expect(User.findByPk).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid or expired token', async () => {
        await authenticate(reqWithAuth('Bearer not-a-real-token'), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects a refresh token used as an access token', async () => {
        const refresh = authUtils.generateRefreshToken('user-1', 'jane@example.com');

        await authenticate(reqWithAuth(`Bearer ${refresh}`), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the user no longer exists', async () => {
        const token = authUtils.generateAccessToken('user-1', 'jane@example.com', 'customer');
        User.findByPk.mockResolvedValue(null);

        await authenticate(reqWithAuth(`Bearer ${token}`), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it.each(['suspended', 'banned'])('returns 403 when the user is %s', async (status) => {
        const token = authUtils.generateAccessToken('user-1', 'jane@example.com', 'customer');
        User.findByPk.mockResolvedValue({ id: 'user-1', status });

        await authenticate(reqWithAuth(`Bearer ${token}`), res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 when the user lookup throws', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const token = authUtils.generateAccessToken('user-1', 'jane@example.com', 'customer');
        User.findByPk.mockRejectedValue(new Error('db down'));

        await authenticate(reqWithAuth(`Bearer ${token}`), res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    });
});
