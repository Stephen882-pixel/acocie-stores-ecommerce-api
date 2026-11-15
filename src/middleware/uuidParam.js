const { createError } = require('../helpers/error.helper');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * For router.param: a malformed id cannot name anything, so answer 404 before
 * the query runs (Postgres would reject it and the request would 500).
 *
 *   router.param('id', requireUuidParam('Product not found'));
 */
const requireUuidParam = (notFoundMessage) => (req, res, next, value) =>
    UUID.test(value) ? next() : next(createError(notFoundMessage, 404));

module.exports = { requireUuidParam };
