const { Client } = require('pg');
const { sequelize } = require('../../../models');
const eventService = require('./eventService');
const eventHub = require('./eventHub');

const MAX_DELAY_MS = 30 * 1000;

let client = null;
let timer = null;
let delay = 1000;
let lastSeenAt = null;
let stopped = false;

const onRow = (row) => {
    lastSeenAt = new Date();
    eventHub.dispatch(row);
};

const retry = () => {
    if (stopped || timer) return;
    client?.end().catch(() => {});
    client = null;

    console.log(`SSE listener: reconnect in ${delay} ms`);
    timer = setTimeout(() => { timer = null; connect(); }, delay);
    delay = Math.min(delay * 2, MAX_DELAY_MS);
};

// One dedicated connection, not one from the Sequelize pool: LISTEN holds it.
const connect = async () => {
    const { config, options } = sequelize;
    const c = new Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: options.dialectOptions?.ssl
    });
    client = c;

    c.on('notification', (msg) => {
        try { onRow(JSON.parse(msg.payload)); } catch (err) { console.error('SSE listener: bad payload', err.message); }
    });
    c.on('error', (err) => { console.error('SSE listener error:', err.message); if (c === client) retry(); });
    c.on('end', () => { if (c === client) retry(); });

    try {
        await c.connect();
        await c.query('LISTEN sse_events');

        // Rows committed while we were not connected (section 8, catch-up).
        if (lastSeenAt) (await eventService.since(lastSeenAt)).forEach(onRow);
        lastSeenAt = new Date();
        delay = 1000;
    } catch (err) {
        console.error('SSE listener: connect failed:', err.message);
        if (c === client) retry();
    }
};

const start = () => {
    stopped = false;
    return connect();
};

const stop = async () => {
    stopped = true;
    clearTimeout(timer);
    const c = client;
    client = null;
    await c?.end().catch(() => {});
};

module.exports = { start, stop };
