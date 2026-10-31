/**
 * createError(message, statusCode, { code, details })
 * Services throw these. The error handler turns them into error responses.
 * code defaults to the name of the status (see response.helper.js).
 */
const createError = (message, statusCode = 500, { code, details } = {}) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
};

module.exports = { createError };
