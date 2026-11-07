// Add a name here before a service sends it (SSE_DESIGN.md, section 5).
const EVENTS = Object.freeze({
    ORDER_CREATED:        'order.created',
    ORDER_STATUS_CHANGED: 'order.status_changed',
    SESSION_REVOKED:      'session.revoked'
});

const LEVELS = Object.freeze({
    HIGH:     'HIGH',
    STANDARD: 'STANDARD',
    SILENT:   'SILENT'
});

const MAX_DATA_BYTES = 4096;

module.exports = { EVENTS, LEVELS, MAX_DATA_BYTES };
