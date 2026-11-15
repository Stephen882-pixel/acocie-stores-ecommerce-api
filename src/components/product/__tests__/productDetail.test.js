jest.mock('uuid', () => ({ v4: jest.fn() }));  // ESM-only; pulled in by the S3 helper
jest.mock('../../../models', () => ({
    sequelize: {},
    Product: { findOne: jest.fn(), increment: jest.fn() },
    Category: {}, ProductImage: {}, ProductVariant: {}, Inventory: {}, User: {}
}));

const { Product } = require('../../../models');
const productService = require('../services/productService');

describe('productService.getProductById', () => {
    it('counts the view without reloading the product (which would bring costPrice back)', async () => {
        const product = { id: 'p1', increment: jest.fn() };
        Product.findOne.mockResolvedValue(product);

        await expect(productService.getProductById('p1')).resolves.toBe(product);

        expect(Product.increment).toHaveBeenCalledWith('viewCount', { where: { id: 'p1' } });
        expect(product.increment).not.toHaveBeenCalled();
    });
});
