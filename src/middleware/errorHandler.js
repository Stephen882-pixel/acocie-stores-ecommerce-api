const { sendError } = require('../helpers/response.helper');

const notFound = (req, res) =>
    sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`, { code: 'ROUTE_NOT_FOUND' });

/**
 * Express 5 sends errors thrown in async handlers here.
 * Client errors (4xx) keep their message. Server errors never show it.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // Postgres 22P02, e.g. a malformed uuid in a route without router.param:
    // the request was bad, not the server.
    if (err.parent?.code === '22P02') {
        return sendError(res, 400, 'Invalid identifier in the request', { code: 'INVALID_ID' });
    }

    const statusCode = err.statusCode || err.status || 500;

    if (statusCode < 500) {
        return sendError(res, statusCode, err.message, { code: err.code, details: err.details });
    }

    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
    return sendError(res, 500, 'Something went wrong. Try again later.', {
        details: process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
    });
};

module.exports = { notFound, errorHandler };
