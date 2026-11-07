const { EVENTS } = require('../constants/events');

const HEARTBEAT_MS     = parseInt(process.env.SSE_HEARTBEAT_MS) || 25 * 1000;
const MAX_STREAM_MS    = parseInt(process.env.SSE_MAX_STREAM_MS) || 60 * 60 * 1000;
const MAX_PER_USER     = parseInt(process.env.SSE_MAX_STREAMS_PER_USER) || 5;
const MAX_PER_PROCESS  = parseInt(process.env.SSE_MAX_STREAMS_PER_PROCESS) || 2000;
const MAX_BUFFER_BYTES = 1024 * 1024;
const MAX_BLOCKED_MS   = 30 * 1000;
const SEEN_IDS         = 500;

const all = new Set();
const byUser = new Map();
const byRole = new Map();
let closing = false;
let timers = [];

const addTo = (map, key, conn) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(conn);
};

const removeFrom = (map, key, conn) => {
    const set = map.get(key);
    if (!set) return;
    set.delete(conn);
    if (set.size === 0) map.delete(key);
};

const remove = (conn) => {
    all.delete(conn);
    removeFrom(byUser, conn.userId, conn);
    removeFrom(byRole, conn.role, conn);
};

const end = (conn) => {
    remove(conn);
    try { conn.res.end(); } catch { /* already closed */ }
};

// Writes raw text. Ends the stream if the client cannot keep up (section 9).
const writeRaw = (conn, text) => {
    try {
        if (conn.res.write(text)) return;
        conn.blockedSince = conn.blockedSince || Date.now();
        if (conn.res.writableLength > MAX_BUFFER_BYTES) end(conn);
    } catch {
        end(conn);
    }
};

const toMessage = (row) => ({
    id: Number(row.id),
    event: row.event,
    feature: row.feature,
    level: row.level,
    data: row.data,
    ts: new Date(row.created_at).toISOString()
});

// Writes one event row. Skips an id that the stream already got.
const write = (conn, row) => {
    const message = toMessage(row);
    if (conn.seen.has(message.id)) return;

    conn.seen.add(message.id);
    if (conn.seen.size > SEEN_IDS) conn.seen.delete(conn.seen.values().next().value);

    writeRaw(conn, `id: ${message.id}\nevent: ${message.event}\ndata: ${JSON.stringify(message)}\n\n`);
    if (message.event === EVENTS.SESSION_REVOKED) end(conn);
};

const signal = (conn, event) => writeRaw(conn, `event: ${event}\ndata: {}\n\n`);

const close = (conn) => {
    signal(conn, 'reconnect');
    end(conn);
};

const isFull = () => closing || all.size >= MAX_PER_PROCESS;

/**
 * add(res, user) -> connection
 * Live events wait in `pending` until flush(), so that none is lost
 * while the stream does its replay.
 */
const add = (res, { userId, role }) => {
    const conn = { res, userId, role, openedAt: Date.now(), seen: new Set(), pending: [], blockedSince: null };
    res.on('drain', () => { conn.blockedSince = null; });

    all.add(conn);
    addTo(byUser, userId, conn);
    addTo(byRole, role, conn);

    const own = byUser.get(userId);
    if (own.size > MAX_PER_USER) close(own.values().next().value);

    return conn;
};

const flush = (conn) => {
    const pending = conn.pending;
    conn.pending = null;
    pending.forEach(row => write(conn, row));
};

// Gives one outbox row to the streams of its audience.
const dispatch = (row) => {
    let targets;
    if (row.audience === 'user') targets = byUser.get(row.userId);
    else if (row.audience === 'role') targets = byRole.get(row.role);
    else targets = all;

    for (const conn of [...(targets || [])]) {
        if (conn.pending) conn.pending.push(row);
        else write(conn, row);
    }
};

const tick = () => {
    const now = Date.now();
    for (const conn of [...all]) {
        if (now - conn.openedAt > MAX_STREAM_MS) close(conn);
        else if (conn.blockedSince && now - conn.blockedSince > MAX_BLOCKED_MS) end(conn);
        else writeRaw(conn, ': ping\n\n');
    }
};

const start = () => {
    closing = false;
    timers = [
        setInterval(tick, HEARTBEAT_MS),
        setInterval(() => { if (all.size) console.log(`SSE open streams: ${all.size}`); }, 60 * 1000)
    ];
    timers.forEach(timer => timer.unref());
};

// Stops new streams and tells every client to reconnect to another task.
const shutdown = () => {
    closing = true;
    timers.forEach(clearInterval);
    [...all].forEach(close);
};

const size = () => all.size;

module.exports = { add, remove, flush, write, signal, dispatch, isFull, start, shutdown, size, tick };
