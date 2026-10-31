const express = require('express');
const request = require('supertest');
const { notFound, errorHandler } = require('../errorHandler');
const { createError } = require('../../helpers/error.helper');
const { sendSuccess, paginate } = require('../../helpers/response.helper');

const buildApp = (handler) => {
    const app = express();
    app.use(express.json());
    app.get('/x', handler);
    app.post('/x', handler);
    app.use(notFound);
    app.use(errorHandler);
    return app;
};

describe('response helpers', () => {
    it('sendSuccess wraps data, and adds message and meta only when given', async () => {
        const res = await request(buildApp((req, res) => sendSuccess(res, { id: 1 }))).get('/x');
        expect(res.body).toEqual({ success: true, data: { id: 1 } });

        const created = await request(buildApp((req, res) =>
            sendSuccess(res, [], { statusCode: 201, message: 'Done', meta: { pagination: paginate(0, 1, 20) } })
        )).get('/x');
        expect(created.status).toBe(201);
        expect(created.body).toEqual({
            success: true,
            message: 'Done',
            data: [],
            meta: { pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }
        });
    });

    it('paginate parses strings and rounds totalPages up', () => {
        expect(paginate(41, '2', '20')).toEqual({ total: 41, page: 2, limit: 20, totalPages: 3 });
    });
});

describe('errorHandler', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('sends a thrown client error with its default code', async () => {
        const res = await request(buildApp(async () => { throw createError('Product not found', 404); })).get('/x');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            success: false,
            error: { statusCode: 404, code: 'NOT_FOUND', message: 'Product not found' }
        });
    });

    it('keeps a specific code and details', async () => {
        const res = await request(buildApp(async () => {
            throw createError('Order must be in shipped status', 400, {
                code: 'INVALID_ORDER_STATUS', details: { currentStatus: 'pending' }
            });
        })).get('/x');

        expect(res.body.error).toEqual({
            statusCode: 400,
            code: 'INVALID_ORDER_STATUS',
            message: 'Order must be in shipped status',
            details: { currentStatus: 'pending' }
        });
    });

    it('hides the message of an unexpected error', async () => {
        const res = await request(buildApp(async () => { throw new Error('relation "users" does not exist'); })).get('/x');

        expect(res.status).toBe(500);
        expect(res.body.error.code).toBe('INTERNAL_ERROR');
        expect(res.body.error.message).toBe('Something went wrong. Try again later.');
        expect(JSON.stringify(res.body)).not.toContain('relation');
    });

    it('keeps the 400 status of a malformed JSON body', async () => {
        const res = await request(buildApp((req, res) => sendSuccess(res)))
            .post('/x').set('Content-Type', 'application/json').send('{bad json');

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('sends ROUTE_NOT_FOUND for an unknown route', async () => {
        const res = await request(buildApp((req, res) => sendSuccess(res))).get('/nope');

        expect(res.status).toBe(404);
        expect(res.body.error).toEqual({ statusCode: 404, code: 'ROUTE_NOT_FOUND', message: 'Route GET /nope not found' });
    });
});
