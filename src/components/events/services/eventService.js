const { Op } = require('sequelize');
const { SseEvent, sequelize } = require('../../../models');
const { EVENTS, LEVELS, MAX_DATA_BYTES } = require('../constants/events');

const REPLAY_LIMIT = 500;
const OVERLAP_MS = 10 * 1000; // ids are given at insert, not at commit (section 8)

const targetsOf = (to = {}) => [
    ...[...new Set(to.userIds || [])].map(userId => ({ audience: 'user', userId })),
    ...(to.role ? [{ audience: 'role', role: to.role }] : []),
    ...(to.all ? [{ audience: 'all' }] : [])
];

/**
 * record(transaction, { event, feature, level, to, data })
 * Writes the event in the caller's transaction. PostgreSQL sends the
 * NOTIFY only if that transaction commits.
 * `to` is { userIds: [...] }, { role: 'admin' } or { all: true }.
 */
const record = async (transaction, { event, feature, level, to, data = {} }) => {
    if (!Object.values(EVENTS).includes(event)) throw new Error(`Unknown SSE event: ${event}`);
    if (!Object.values(LEVELS).includes(level)) throw new Error(`Unknown SSE level: ${level}`);
    if (Buffer.byteLength(JSON.stringify(data)) > MAX_DATA_BYTES) throw new Error(`SSE data for ${event} is larger than ${MAX_DATA_BYTES} bytes`);

    const targets = targetsOf(to);
    if (targets.length === 0) throw new Error(`SSE event ${event} has no audience`);

    const rows = await SseEvent.bulkCreate(
        targets.map(target => ({ event, feature, level, data, ...target })),
        { transaction, returning: true }
    );

    for (const row of rows) {
        await sequelize.query('SELECT pg_notify(\'sse_events\', :payload)', {
            replacements: { payload: JSON.stringify(row.toJSON()) },
            transaction
        });
    }
};

/**
 * replay(lastEventId, user) -> { rows } or { resync: true }
 * Gives the rows that this user can see, from 10 s before the last id.
 */
const replay = async (lastEventId, { userId, role }) => {
    if (!lastEventId) return { rows: [] };

    const from = /^\d+$/.test(lastEventId) && await SseEvent.findByPk(lastEventId, { attributes: ['created_at'] });
    if (!from) return { resync: true };

    const rows = await SseEvent.findAll({
        where: {
            created_at: { [Op.gte]: new Date(from.created_at.getTime() - OVERLAP_MS) },
            [Op.or]: [
                { audience: 'user', userId },
                { audience: 'role', role },
                { audience: 'all' }
            ]
        },
        order: [['id', 'ASC']],
        limit: REPLAY_LIMIT + 1
    });

    if (rows.length > REPLAY_LIMIT) return { resync: true };
    return { rows: rows.map(row => row.toJSON()) };
};

// All rows from 10 s before `since`. The listener uses it after a reconnect.
const since = async (since) => {
    const rows = await SseEvent.findAll({
        where: { created_at: { [Op.gte]: new Date(since.getTime() - OVERLAP_MS) } },
        order: [['id', 'ASC']]
    });
    return rows.map(row => row.toJSON());
};

const deleteOlderThan = (date) => SseEvent.destroy({ where: { created_at: { [Op.lt]: date } } });

module.exports = { record, replay, since, deleteOlderThan };
