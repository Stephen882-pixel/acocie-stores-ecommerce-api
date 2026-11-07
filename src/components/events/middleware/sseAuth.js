const jwt = require('jsonwebtoken');
const { User } = require('../../../models');
const { sendError } = require('../../../helpers/response.helper');

// Accepts only the short-lived SSE token from GET /events/token (section 6).
const sseAuth = async (req, res, next) => {
    let decoded;
    try {
        decoded = jwt.verify(req.query.token || '', process.env.JWT_SECRET);
    } catch {
        return sendError(res, 401, 'Invalid or expired SSE token');
    }

    if (decoded.scope !== 'sse') return sendError(res, 401, 'Invalid or expired SSE token');

    const user = await User.findByPk(decoded.userId);
    if (!user) return sendError(res, 401, 'User not found');
    if (user.status !== 'active') return sendError(res, 403, 'Account is suspended or banned');

    req.user = { userId: user.id, role: user.role };
    next();
};

module.exports = sseAuth;
