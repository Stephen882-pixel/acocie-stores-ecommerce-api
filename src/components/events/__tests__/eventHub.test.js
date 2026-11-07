const { EventEmitter } = require('events');
const eventHub = require('../services/eventHub');

const mockRes = () => {
    const res = new EventEmitter();
    res.chunks = [];
    res.writableLength = 0;
    res.write = jest.fn((text) => { res.chunks.push(text); return true; });
    res.end = jest.fn();
    return res;
};

const row = (id, audience, extra = {}) => ({
    id: String(id), event: 'order.created', feature: 'orders', level: 'STANDARD',
    audience, data: {}, created_at: '2026-11-02T10:00:00.000Z', ...extra
});

const open = (userId, role) => {
    const res = mockRes();
    const conn = eventHub.add(res, { userId, role });
    eventHub.flush(conn);
    return { res, conn };
};

describe('eventHub', () => {
    const conns = [];
    const track = (c) => { conns.push(c.conn); return c; };

    afterEach(() => {
        conns.splice(0).forEach(eventHub.remove);
    });

    it('writes each event only to its audience', () => {
        const buyer = track(open('u-1', 'customer'));
        const admin = track(open('u-2', 'admin'));

        eventHub.dispatch(row(1, 'user', { userId: 'u-1' }));
        eventHub.dispatch(row(2, 'role', { role: 'admin' }));
        eventHub.dispatch(row(3, 'all'));

        expect(buyer.res.chunks.join('')).toMatch(/id: 1\n[\s\S]*id: 3\n/);
        expect(buyer.res.chunks.join('')).not.toMatch(/id: 2\n/);
        expect(admin.res.chunks.join('')).toMatch(/id: 2\n[\s\S]*id: 3\n/);
        expect(admin.res.chunks.join('')).not.toMatch(/id: 1\n/);
    });

    it('skips an id that the stream already got', () => {
        const { res } = track(open('u-1', 'customer'));

        eventHub.dispatch(row(1, 'all'));
        eventHub.dispatch(row(1, 'all'));

        expect(res.write).toHaveBeenCalledTimes(1);
    });

    it('keeps live events until flush, so that the replay goes first', () => {
        const res = mockRes();
        const conn = eventHub.add(res, { userId: 'u-1', role: 'customer' });
        conns.push(conn);

        eventHub.dispatch(row(2, 'all'));
        expect(res.write).not.toHaveBeenCalled();

        eventHub.write(conn, row(1, 'all'));
        eventHub.write(conn, row(2, 'all'));
        eventHub.flush(conn);

        expect(res.chunks.map(c => c.split('\n')[0])).toEqual(['id: 1', 'id: 2']);
    });

    it('ends a stream when its buffer is larger than 1 MB', () => {
        const { res } = track(open('u-1', 'customer'));
        res.write.mockReturnValue(false);
        res.writableLength = 2 * 1024 * 1024;

        eventHub.dispatch(row(1, 'all'));

        expect(res.end).toHaveBeenCalled();
        expect(eventHub.size()).toBe(0);
    });

    it('closes the stream after session.revoked', () => {
        const { res } = track(open('u-1', 'customer'));

        eventHub.dispatch(row(1, 'user', { userId: 'u-1', event: 'session.revoked' }));

        expect(res.chunks[0]).toMatch(/event: session.revoked/);
        expect(res.end).toHaveBeenCalled();
    });

    it('closes the oldest stream of a user above 5 streams', () => {
        const first = track(open('u-1', 'customer'));
        for (let i = 0; i < 5; i++) track(open('u-1', 'customer'));

        expect(first.res.chunks.join('')).toMatch(/event: reconnect/);
        expect(first.res.end).toHaveBeenCalled();
        expect(eventHub.size()).toBe(5);
    });
});
