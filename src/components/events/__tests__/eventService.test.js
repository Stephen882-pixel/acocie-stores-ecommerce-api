jest.mock('../../../models', () => ({
    SseEvent: { bulkCreate: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
    sequelize: { query: jest.fn() }
}));

const { SseEvent, sequelize } = require('../../../models');
const eventService = require('../services/eventService');

const base = { event: 'order.created', feature: 'orders', level: 'STANDARD', data: { orderId: 'o-1' } };

describe('eventService.record', () => {
    beforeEach(() => {
        SseEvent.bulkCreate.mockImplementation(async (rows) => rows.map((row, i) => ({ toJSON: () => ({ id: i + 1, ...row }) })));
    });

    it('inserts one row for each unique user and notifies on the same transaction', async () => {
        await eventService.record('tx', { ...base, to: { userIds: ['u-1', 'u-2', 'u-1'] } });

        const [rows, options] = SseEvent.bulkCreate.mock.calls[0];
        expect(rows.map(r => r.userId)).toEqual(['u-1', 'u-2']);
        expect(options.transaction).toBe('tx');
        expect(sequelize.query).toHaveBeenCalledTimes(2);
        expect(sequelize.query.mock.calls[0][1].transaction).toBe('tx');
    });

    it('inserts one row for a role audience', async () => {
        await eventService.record('tx', { ...base, to: { role: 'admin' } });

        expect(SseEvent.bulkCreate.mock.calls[0][0]).toEqual([expect.objectContaining({ audience: 'role', role: 'admin' })]);
    });

    it.each([
        ['an unknown event', { ...base, event: 'order.exploded', to: { all: true } }],
        ['an unknown level', { ...base, level: 'LOUD', to: { all: true } }],
        ['no audience', { ...base, to: {} }],
        ['data larger than 4 KB', { ...base, data: { text: 'x'.repeat(4100) }, to: { all: true } }]
    ])('throws for %s', async (_, input) => {
        await expect(eventService.record('tx', input)).rejects.toThrow();
        expect(SseEvent.bulkCreate).not.toHaveBeenCalled();
    });
});

describe('eventService.replay', () => {
    const user = { userId: 'u-1', role: 'customer' };

    it('does no replay without a last id', async () => {
        expect(await eventService.replay(undefined, user)).toEqual({ rows: [] });
        expect(SseEvent.findByPk).not.toHaveBeenCalled();
    });

    it('asks for a resync when the last id is not in the outbox', async () => {
        SseEvent.findByPk.mockResolvedValue(null);
        expect(await eventService.replay('99', user)).toEqual({ resync: true });
    });

    it('asks for a resync when the last id is not a number', async () => {
        expect(await eventService.replay('abc', user)).toEqual({ resync: true });
    });

    it('asks for a resync when more than 500 rows were missed', async () => {
        SseEvent.findByPk.mockResolvedValue({ created_at: new Date() });
        SseEvent.findAll.mockResolvedValue(new Array(501).fill({ toJSON: () => ({}) }));
        expect(await eventService.replay('5', user)).toEqual({ resync: true });
    });

    it('reads from 10 s before the last event', async () => {
        const createdAt = new Date('2026-11-02T10:00:10.000Z');
        SseEvent.findByPk.mockResolvedValue({ created_at: createdAt });
        SseEvent.findAll.mockResolvedValue([{ toJSON: () => ({ id: '6' }) }]);

        expect(await eventService.replay('5', user)).toEqual({ rows: [{ id: '6' }] });
        const { where } = SseEvent.findAll.mock.calls[0][0];
        const gte = Object.getOwnPropertySymbols(where.created_at)[0];
        expect(where.created_at[gte]).toEqual(new Date('2026-11-02T10:00:00.000Z'));
    });
});
