/**
 * Route-level tests for /api/v1/categories.
 *
 * Exercises the real router, authenticate + requirePermission, Joi validation and
 * controller over HTTP. The service layer and DB models are mocked, so these
 * tests check request/response wiring, not business logic (see categoryService.test.js).
 */
jest.mock('../services/categoryService');
jest.mock('../../../models', () => ({
    User: { findByPk: jest.fn() }
}));
// Resolve permissions from the code defaults instead of the database.
jest.mock('../../rbac/services/permissionService', () => {
    const actual = jest.requireActual('../../rbac/constants/permissions');
    const { can } = jest.requireActual('../../rbac/services/permissionService');
    return { can, getRolePermissions: async (role) => new Set(actual.DEFAULT_ROLE_PERMISSIONS[role] || []) };
});

const express = require('express');
const { errorHandler } = require('../../../middleware/errorHandler');
const request = require('supertest');
const categoryService = require('../services/categoryService');
const { User } = require('../../../models');
const authUtils = require('../../auth/utils/authUtils');
const categoryRoutes = require('../routes/categoryRoutes');

const PARENT_ID = '33333333-3333-4333-8333-333333333333';

// server.js connects to the DB and listens on import, so mount the router on a bare app.
const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/categories', categoryRoutes);
    app.use(errorHandler);
    return app;
};

const errorBody = (statusCode, code, message, details) =>
    ({ success: false, error: { statusCode, code, message, ...(details !== undefined && { details }) } });

const serviceError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

// authenticate reads the role from the database, so the mocked user must have it too.
const tokenFor = (role) => {
    User.findByPk.mockResolvedValue({ id: 'user-1', status: 'active', role });
    return authUtils.generateAccessToken('user-1', 'jane@example.com', role);
};

describe('Category routes', () => {
    let app;

    beforeAll(() => {
        app = buildApp();
    });

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        User.findByPk.mockResolvedValue({ id: 'user-1', status: 'active' });
    });

    describe('GET /', () => {
        it('is public and returns the categories', async () => {
            categoryService.getAllCategories.mockResolvedValue([{ id: 'cat-1' }]);

            const res = await request(app).get('/api/v1/categories?nested=true');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: [{ id: 'cat-1' }] });
            expect(categoryService.getAllCategories).toHaveBeenCalledWith({
                includeInactive: undefined, nested: 'true', userRole: undefined
            });
        });

        it('returns 400 for an invalid query flag', async () => {
            const res = await request(app).get('/api/v1/categories?nested=yes');

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
            expect(categoryService.getAllCategories).not.toHaveBeenCalled();
        });

        it('drops unknown query params', async () => {
            categoryService.getAllCategories.mockResolvedValue([]);

            await request(app).get('/api/v1/categories?foo=bar');

            expect(categoryService.getAllCategories).toHaveBeenCalledWith({
                includeInactive: undefined, nested: undefined, userRole: undefined
            });
        });
    });

    describe('GET /:id', () => {
        it('is public and passes includeProducts through', async () => {
            categoryService.getCategoryById.mockResolvedValue({ id: 'cat-1' });

            const res = await request(app).get('/api/v1/categories/cat-1?includeProducts=true');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: { id: 'cat-1' } });
            expect(categoryService.getCategoryById).toHaveBeenCalledWith('cat-1', 'true');
        });

        it('returns 404 for an unknown category', async () => {
            categoryService.getCategoryById.mockRejectedValue(serviceError('Category not found', 404));

            const res = await request(app).get('/api/v1/categories/missing');

            expect(res.status).toBe(404);
            expect(res.body).toEqual(errorBody(404, 'NOT_FOUND', 'Category not found'));
        });

        it('returns 500 for an unexpected error', async () => {
            categoryService.getCategoryById.mockRejectedValue(new Error('db down'));

            const res = await request(app).get('/api/v1/categories/cat-1');

            expect(res.status).toBe(500);
        });
    });

    describe('admin-only endpoints', () => {
        const endpoints = [
            ['POST', '/api/v1/categories', { name: 'Lamps' }],
            ['PUT', '/api/v1/categories/cat-1', { name: 'Lamps' }],
            ['DELETE', '/api/v1/categories/cat-1', undefined]
        ];

        it.each(endpoints)('%s %s returns 401 without a token', async (method, url, body) => {
            const res = await request(app)[method.toLowerCase()](url).send(body);

            expect(res.status).toBe(401);
        });

        it.each(endpoints)('%s %s returns 403 for a customer', async (method, url, body) => {
            const res = await request(app)[method.toLowerCase()](url)
                .set('Authorization', `Bearer ${tokenFor('customer')}`)
                .send(body);

            expect(res.status).toBe(403);
        });

        it.each(endpoints)('%s %s returns 403 for a vendor', async (method, url, body) => {
            const res = await request(app)[method.toLowerCase()](url)
                .set('Authorization', `Bearer ${tokenFor('vendor')}`)
                .send(body);

            expect(res.status).toBe(403);
            expect(categoryService.createCategory).not.toHaveBeenCalled();
            expect(categoryService.updateCategory).not.toHaveBeenCalled();
            expect(categoryService.deleteCategory).not.toHaveBeenCalled();
        });
    });

    describe('POST /', () => {
        it.each(['admin', 'super_admin'])('lets %s create a category', async (role) => {
            categoryService.createCategory.mockResolvedValue({ id: 'cat-new', name: 'Lamps' });

            const res = await request(app)
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${tokenFor(role)}`)
                .send({ name: '  Lamps ', parentId: PARENT_ID, slug: 'ignored' });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({
                success: true,
                message: 'Category created successfully',
                data: { id: 'cat-new', name: 'Lamps' }
            });
            expect(categoryService.createCategory).toHaveBeenCalledWith({
                name: 'Lamps', parentId: PARENT_ID, displayOrder: 0
            });
        });

        it('returns 400 for an invalid body', async () => {
            const res = await request(app)
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${tokenFor('admin')}`)
                .send({ name: 'A' });

            expect(res.status).toBe(400);
            expect(categoryService.createCategory).not.toHaveBeenCalled();
        });

        it('maps a service error to its status code', async () => {
            categoryService.createCategory.mockRejectedValue(serviceError('Parent category not found', 404));

            const res = await request(app)
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${tokenFor('admin')}`)
                .send({ name: 'Lamps', parentId: PARENT_ID });

            expect(res.status).toBe(404);
            expect(res.body).toEqual(errorBody(404, 'NOT_FOUND', 'Parent category not found'));
        });
    });

    describe('PUT /:id', () => {
        it('updates the category', async () => {
            categoryService.updateCategory.mockResolvedValue({ id: 'cat-1', description: 'New' });

            const res = await request(app)
                .put('/api/v1/categories/cat-1')
                .set('Authorization', `Bearer ${tokenFor('admin')}`)
                .send({ description: 'New' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Category updated successfully');
            expect(categoryService.updateCategory).toHaveBeenCalledWith('cat-1', expect.objectContaining({ description: 'New' }));
        });

        it('maps a service error to its status code', async () => {
            categoryService.updateCategory.mockRejectedValue(serviceError('Category cannot be its own parent', 400));

            const res = await request(app)
                .put('/api/v1/categories/cat-1')
                .set('Authorization', `Bearer ${tokenFor('admin')}`)
                .send({ parentId: PARENT_ID });

            expect(res.status).toBe(400);
            expect(res.body).toEqual(errorBody(400, 'BAD_REQUEST', 'Category cannot be its own parent'));
        });
    });

    describe('DELETE /:id', () => {
        it('deletes the category', async () => {
            categoryService.deleteCategory.mockResolvedValue();

            const res = await request(app)
                .delete('/api/v1/categories/cat-1')
                .set('Authorization', `Bearer ${tokenFor('admin')}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: 'Category deleted successfully', data: null });
            expect(categoryService.deleteCategory).toHaveBeenCalledWith('cat-1');
        });

        it('returns 400 when the category still has products', async () => {
            categoryService.deleteCategory.mockRejectedValue(
                serviceError('Cannot delete category with existing products', 400)
            );

            const res = await request(app)
                .delete('/api/v1/categories/cat-1')
                .set('Authorization', `Bearer ${tokenFor('admin')}`);

            expect(res.status).toBe(400);
        });
    });
});
