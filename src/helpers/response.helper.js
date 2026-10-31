const STATUS_CODES = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR'
};

const sendSuccess = (res, data = null, { statusCode = 200, message, meta } = {}) =>
    res.status(statusCode).json({
        success: true,
        ...(message && { message }),
        data,
        ...(meta && { meta })
    });

const sendError = (res, statusCode, message, { code, details } = {}) =>
    res.status(statusCode).json({
        success: false,
        error: {
            statusCode,
            code: code || STATUS_CODES[statusCode] || 'ERROR',
            message,
            ...(details !== undefined && { details })
        }
    });

const paginate = (total, page, limit) => ({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
});

module.exports = { sendSuccess, sendError, paginate };
