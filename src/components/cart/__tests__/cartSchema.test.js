const cartSchema = require('../schemas/cart.schema');

const validate = (schema, body) => schema.validate(body, { abortEarly: false, stripUnknown: true, convert: true });

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';

describe('cart.schema', () => {
    describe('addToCart', () => {
        it('accepts a productId alone and defaults quantity to 1', () => {
            const { error, value } = validate(cartSchema.addToCart, { productId: PRODUCT_ID });

            expect(error).toBeUndefined();
            expect(value.quantity).toBe(1);
        });

        it('converts a numeric string quantity', () => {
            expect(validate(cartSchema.addToCart, { productId: PRODUCT_ID, quantity: '3' }).value.quantity).toBe(3);
        });

        it('allows a null variantId', () => {
            expect(validate(cartSchema.addToCart, { productId: PRODUCT_ID, variantId: null }).error).toBeUndefined();
        });

        it.each([
            ['missing productId', {}],
            ['non-uuid productId', { productId: '123' }],
            ['non-uuid variantId', { productId: PRODUCT_ID, variantId: 'abc' }],
            ['zero quantity', { productId: PRODUCT_ID, quantity: 0 }],
            ['quantity over 100', { productId: PRODUCT_ID, quantity: 101 }],
            ['fractional quantity', { productId: PRODUCT_ID, quantity: 1.5 }]
        ])('rejects %s', (_, body) => {
            expect(validate(cartSchema.addToCart, body).error).toBeDefined();
        });

        it('strips fields the client should not control', () => {
            const { value } = validate(cartSchema.addToCart, { productId: PRODUCT_ID, priceAtAddition: '0.01', cartId: 'x' });

            expect(value).not.toHaveProperty('priceAtAddition');
            expect(value).not.toHaveProperty('cartId');
        });
    });

    describe('updateCartItem', () => {
        it('requires a quantity', () => {
            expect(validate(cartSchema.updateCartItem, {}).error).toBeDefined();
        });

        it.each([1, 100])('accepts quantity %p', (quantity) => {
            expect(validate(cartSchema.updateCartItem, { quantity }).error).toBeUndefined();
        });

        it.each([0, 101])('rejects quantity %p', (quantity) => {
            expect(validate(cartSchema.updateCartItem, { quantity }).error).toBeDefined();
        });
    });

    describe('mergeCarts', () => {
        it('requires a sessionId', () => {
            expect(validate(cartSchema.mergeCarts, {}).error).toBeDefined();
        });
    });
});
