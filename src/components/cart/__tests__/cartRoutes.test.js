/**
 * Route-level tests for /api/v1/cart.
 *
 * Exercises the real router, optionalAuth/authenticate, Joi validation and
 * controller over HTTP. The service layer and DB models are mocked, so these
 * tests check request/response wiring, not business logic (see cartService.test.js).
 */
// Explicit factory: automocking would load the real service, which requires the ESM-only uuid package.
jest.mock('../services/cartService', () => ({
    getCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    clearCart: jest.fn(),
    validateCart: jest.fn(),
    mergeCarts: jest.fn()
}));
jest.mock('../../../models', () => ({
    User: { findByPk: jest.fn() }
}));

const express = require('express');
const { errorHandler } = require('../../../middleware/errorHandler');
const request = require('supertest');
const cartService = require('../services/cartService');
const { User } = require('../../../models');
const authUtils = require('../../auth/utils/authUtils');
const cartRoutes = require('../routes/cartRoutes');

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';

// server.js connects to the DB and listens on import, so mount the router on a bare app.
const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/cart', cartRoutes);
    app.use(errorHandler);
    return app;
};

const errorBody = (statusCode, code, message, details) =>
    ({ success: false, error: { statusCode, code, message, ...(details !== undefined && { details }) } });

const serviceError = (message, statusCode, extra = {}) =>
    Object.assign(new Error(message), { statusCode }, extra);

describe('Cart routes', () => {
    let app;
    let token;

    beforeAll(() => {
        app = buildApp();
    });

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        token = authUtils.generateAccessToken('user-1', 'jane@example.com', 'customer');
        User.findByPk.mockResolvedValue({ id: 'user-1', status: 'active' });
    });

    describe('optional authentication', () => {
        beforeEach(() => {
            cartService.getCart.mockResolvedValue({ id: 'cart-1', items: [] });
        });

        it('passes the user id for an authenticated request', async () => {
            const res = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', `Bearer ${token}`)
                .set('X-Session-Id', 'session-1');

            expect(res.status).toBe(200);
            expect(cartService.getCart).toHaveBeenCalledWith('user-1', 'session-1');
        });

        it('lets a guest through with only a session header', async () => {
            const res = await request(app).get('/api/v1/cart').set('X-Session-Id', 'session-1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: { id: 'cart-1', items: [] } });
            expect(cartService.getCart).toHaveBeenCalledWith(undefined, 'session-1');
            expect(User.findByPk).not.toHaveBeenCalled();
        });

        it('rejects an invalid bearer token instead of falling back to guest', async () => {
            const res = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', 'Bearer not-a-token')
                .set('X-Session-Id', 'session-1');

            expect(res.status).toBe(401);
            expect(cartService.getCart).not.toHaveBeenCalled();
        });

        it('rejects a suspended user', async () => {
            User.findByPk.mockResolvedValue({ id: 'user-1', status: 'suspended' });

            const res = await request(app).get('/api/v1/cart').set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /', () => {
        it('maps a service error to its status code', async () => {
            cartService.getCart.mockRejectedValue(serviceError('User authentication or session ID required', 400));

            const res = await request(app).get('/api/v1/cart');

            expect(res.status).toBe(400);
            expect(res.body).toEqual(errorBody(400, 'BAD_REQUEST', 'User authentication or session ID required'));
        });
    });

    describe('POST /items', () => {
        it('returns 201 with the item and the guest session id', async () => {
            cartService.addToCart.mockResolvedValue({ cartItem: { id: 'item-1' }, sessionId: 'generated-session' });

            const res = await request(app).post('/api/v1/cart/items').send({ productId: PRODUCT_ID });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({
                success: true,
                message: 'Item added to cart',
                data: { cartItem: { id: 'item-1' }, sessionId: 'generated-session' }
            });
            expect(cartService.addToCart).toHaveBeenCalledWith({ productId: PRODUCT_ID, quantity: 1 }, undefined, undefined);
        });

        it('strips fields the client should not control before calling the service', async () => {
            cartService.addToCart.mockResolvedValue({ cartItem: {} });

            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId: PRODUCT_ID, quantity: 2, priceAtAddition: '0.01' });

            expect(cartService.addToCart).toHaveBeenCalledWith({ productId: PRODUCT_ID, quantity: 2 }, 'user-1', undefined);
        });

        it('returns 400 and never calls the service for an invalid body', async () => {
            const res = await request(app).post('/api/v1/cart/items').send({ productId: 'nope', quantity: 0 });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
            expect(cartService.addToCart).not.toHaveBeenCalled();
        });

        it('includes availableStock in an insufficient-stock error', async () => {
            cartService.addToCart.mockRejectedValue(
                serviceError('Insufficient stock', 400, { code: 'INSUFFICIENT_STOCK', details: { availableStock: 2 } })
            );

            const res = await request(app).post('/api/v1/cart/items').send({ productId: PRODUCT_ID, quantity: 5 });

            expect(res.status).toBe(400);
            expect(res.body).toEqual(errorBody(400, 'INSUFFICIENT_STOCK', 'Insufficient stock', { availableStock: 2 }));
        });

        it('includes availableStock even when it is zero', async () => {
            cartService.addToCart.mockRejectedValue(
                serviceError('Insufficient stock', 400, { code: 'INSUFFICIENT_STOCK', details: { availableStock: 0 } })
            );

            const res = await request(app).post('/api/v1/cart/items').send({ productId: PRODUCT_ID });

            expect(res.body.error.details.availableStock).toBe(0);
        });
    });

    describe('PUT /items/:id', () => {
        it('passes the item id, quantity and caller to the service', async () => {
            cartService.updateCartItem.mockResolvedValue({ id: 'item-1', quantity: 3 });

            const res = await request(app)
                .put('/api/v1/cart/items/item-1')
                .set('X-Session-Id', 'session-1')
                .send({ quantity: 3 });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: 'Cart item updated', data: { id: 'item-1', quantity: 3 } });
            expect(cartService.updateCartItem).toHaveBeenCalledWith('item-1', 3, undefined, 'session-1');
        });

        it('returns 400 for a missing quantity', async () => {
            const res = await request(app).put('/api/v1/cart/items/item-1').send({});

            expect(res.status).toBe(400);
            expect(cartService.updateCartItem).not.toHaveBeenCalled();
        });

        it('returns 404 for an item not in the caller\'s cart', async () => {
            cartService.updateCartItem.mockRejectedValue(serviceError('Cart item not found', 404));

            const res = await request(app).put('/api/v1/cart/items/item-x').send({ quantity: 1 });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /items/:id', () => {
        it('removes the item', async () => {
            cartService.removeCartItem.mockResolvedValue();

            const res = await request(app).delete('/api/v1/cart/items/item-1').set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: 'Item removed from cart', data: null });
            expect(cartService.removeCartItem).toHaveBeenCalledWith('item-1', 'user-1', undefined);
        });
    });

    describe('DELETE /clear', () => {
        it('clears the cart and is not swallowed by the /items/:id route', async () => {
            cartService.clearCart.mockResolvedValue();

            const res = await request(app).delete('/api/v1/cart/clear').set('X-Session-Id', 'session-1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: 'Cart cleared successfully', data: null });
            expect(cartService.clearCart).toHaveBeenCalledWith(undefined, 'session-1');
            expect(cartService.removeCartItem).not.toHaveBeenCalled();
        });
    });

    describe('GET /validate', () => {
        it('returns the validation result as-is', async () => {
            const validation = { isValid: false, issues: ['x'], invalidItems: [] };
            cartService.validateCart.mockResolvedValue(validation);

            const res = await request(app).get('/api/v1/cart/validate').set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: validation });
        });
    });

    describe('POST /merge', () => {
        it('requires authentication', async () => {
            const res = await request(app).post('/api/v1/cart/merge').send({ sessionId: 'session-1' });

            expect(res.status).toBe(401);
            expect(cartService.mergeCarts).not.toHaveBeenCalled();
        });

        it('returns 400 when the session id is missing', async () => {
            const res = await request(app)
                .post('/api/v1/cart/merge')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(cartService.mergeCarts).not.toHaveBeenCalled();
        });
    });
});
