const eventService = require('../services/eventService');

const RETENTION_HOURS = parseInt(process.env.SSE_RETENTION_HOURS) || 24;

const run = () => eventService
    .deleteOlderThan(new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000))
    .catch(err => console.error('SSE retention failed:', err.message));

// Deletes outbox rows older than the retention time, every hour.
const start = () => setInterval(run, 60 * 60 * 1000).unref();

module.exports = { start, run };
    