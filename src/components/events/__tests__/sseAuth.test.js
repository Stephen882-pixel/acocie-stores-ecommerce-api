jest.mock('../../../models', () => ({
    User: { findByPk: jest.fn() }
}));

const jwt = require('jsonwebtoken');
const { User } = require('../../../models');
const authUtils = require('../../auth/utils/authUtils');
const sseAuth = require('../middleware/sseAuth');
const authenticate = require('../../auth/middleware/authMiddleware');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const sseToken = (payload = {}, expiresIn = 60) =>
    jwt.sign({ userId: 'u-1', role: 'customer', scope: 'sse', ...payload }, process.env.JWT_SECRET, { expiresIn });

describe('sseAuth middleware', () => {
    let res;
    let next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
    });

    it('sets req.user for a valid SSE token and an active user', async () => {
        User.findByPk.mockResolvedValue({ id: 'u-1', status: 'active', role: 'vendor' });
        const req = { query: { token: sseToken() } };

        await sseAuth(req, res, next);

        expect(req.user).toEqual({ userId: 'u-1', role: 'vendor' });
        expect(next).toHaveBeenCalled();
    });

    it.each([
        ['a missing token', undefined],
        ['an expired token', sseToken({}, -1)],
        ['a normal access token', authUtils.generateAccessToken('u-1', 'jane@example.com', 'customer')]
    ])('returns 401 for %s', async (_, token) => {
        await sseAuth({ query: { token } }, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 for an inactive user', async () => {
        User.findByPk.mockResolvedValue({ id: 'u-1', status: 'banned', role: 'customer' });

        await sseAuth({ query: { token: sseToken() } }, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('authenticate middleware', () => {
    it('rejects an SSE token', async () => {
        const res = mockRes();
        const next = jest.fn();

        await authenticate({ headers: { authorization: `Bearer ${sseToken()}` } }, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
