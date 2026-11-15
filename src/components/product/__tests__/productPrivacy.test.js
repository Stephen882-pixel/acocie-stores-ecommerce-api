/**
 * Public product data: no cost price anywhere, no vendor emails, and a
 * malformed id is a 404, not a 500.
 */
jest.mock('uuid', () => ({ v4: jest.fn() }));  // ESM-only; pulled in by the S3 helper
jest.mock('../services/productService', () => ({
    getAllProducts: jest.fn(),
    getProductById: jest.fn(),
    searchProducts: jest.fn(),
    getFeaturedProducts: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const { Sequelize } = require('sequelize');
const productService = require('../services/productService');
const productRoutes = require('../routes/productRoutes');
const { errorHandler } = require('../../../middleware/errorHandler');
const defineProduct = require('../models/Product');

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';

const buildApp = () => {
    const app = express();
    app.use('/api/v1/products', productRoutes);
    app.use(errorHandler);
    return app;
};

describe('product privacy and ids', () => {
    it('the Product model leaves costPrice out of every query and include by default', () => {
        // define() needs no connection.
        const sequelize = new Sequelize('postgres://user:pass@localhost:1/none', { logging: false });
        const Product = defineProduct(sequelize);

        expect(Product.options.defaultScope.attributes.exclude).toContain('costPrice');
    });

    it('GET /products/:id answers 404 for a malformed id without querying', async () => {
        const res = await request(buildApp()).get('/api/v1/products/not-a-uuid');

        expect(res.status).toBe(404);
        expect(res.body.error.message).toBe('Product not found');
        expect(productService.getProductById).not.toHaveBeenCalled();
    });

    it('GET /products/:id still serves a well-formed id', async () => {
        productService.getProductById.mockResolvedValue({ id: PRODUCT_ID });

        const res = await request(buildApp()).get(`/api/v1/products/${PRODUCT_ID}`);

        expect(res.status).toBe(200);
        expect(productService.getProductById).toHaveBeenCalledWith(PRODUCT_ID, undefined);
    });

    it('the vendor shown with a product has no email', () => {
        const source = require('fs').readFileSync(require.resolve('../services/productService.js'), 'utf8');
        const vendorIncludes = source.match(/as: 'vendor', attributes: \[[^\]]*\]/g);

        expect(vendorIncludes.length).toBeGreaterThan(0);
        vendorIncludes.forEach((include) => expect(include).not.toMatch(/email/));
    });
});
