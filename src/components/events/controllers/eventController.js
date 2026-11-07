const jwt = require('jsonwebtoken');
const eventService = require('../services/eventService');
const eventHub = require('../services/eventHub');
const { sendSuccess, sendError } = require('../../../helpers/response.helper');

const TOKEN_TTL_SECONDS = parseInt(process.env.SSE_TOKEN_TTL_SECONDS) || 60;

const token = (req, res) => {
    const sseToken = jwt.sign(
        { userId: req.user.userId, role: req.user.role, scope: 'sse' },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_TTL_SECONDS }
    );
    return sendSuccess(res, { url: `/api/v1/events/stream?token=${sseToken}`, expiresIn: TOKEN_TTL_SECONDS });
};

const stream = async (req, res) => {
    if (eventHub.isFull()) {
        res.set('Retry-After', '10');
        return sendError(res, 503, 'Too many open streams. Try again later.');
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();
    res.write('retry: 5000\n\n');

    // Add before the replay, so that no live event is lost between the two.
    const conn = eventHub.add(res, req.user);
    req.on('close', () => eventHub.remove(conn));

    try {
        const lastEventId = req.get('Last-Event-ID') || req.query.lastEventId;
        const { rows, resync } = await eventService.replay(lastEventId, req.user);
        if (resync) eventHub.signal(conn, 'resync');
        else rows.forEach(row => eventHub.write(conn, row));
    } catch (err) {
        console.error('SSE replay failed:', err.message);
        eventHub.signal(conn, 'resync');
    }

    eventHub.flush(conn);
};

module.exports = { token, stream };
