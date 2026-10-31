jest.mock('../../../models', () => ({
    Cart: { findOne: jest.fn(), create: jest.fn() },
    CartItem: { findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), destroy: jest.fn() },
    Product: { findOne: jest.fn() },
    ProductVariant: { findOne: jest.fn() },
    ProductImage: {},
    Inventory: {},
    User: {}
}));
// uuid@13 is ESM-only and cannot be loaded by Jest's CommonJS runtime.
jest.mock('uuid', () => ({ v4: jest.fn() }));

const { Cart, CartItem, Product, ProductVariant } = require('../../../models');
const { v4: uuidv4 } = require('uuid');
const cartService = require('../services/cartService');

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const VARIANT_ID = '22222222-2222-4222-8222-222222222222';

const USER_CART = { id: 'cart-user' };
const GUEST_CART = { id: 'cart-guest' };

const makeProduct = (overrides = {}) => ({
    id: PRODUCT_ID,
    name: 'Solar Lamp',
    price: '100.00',
    status: 'active',
    inventory: { availableStock: 10 },
    ...overrides
});

const makeVariant = (overrides = {}) => ({
    id: VARIANT_ID,
    productId: PRODUCT_ID,
    price: '120.00',
    stockQuantity: 5,
    ...overrides
});

const makeCartItem = (overrides = {}) => {
    const item = {
        id: 'item-1',
        cartId: USER_CART.id,
        productId: PRODUCT_ID,
        variantId: null,
        quantity: 1,
        priceAtAddition: '100.00',
        product: makeProduct(),
        variant: null,
        ...overrides
    };
    item.update = jest.fn().mockResolvedValue(item);
    item.destroy = jest.fn().mockResolvedValue();
    item.toJSON = jest.fn(() => ({ id: item.id, quantity: item.quantity, priceAtAddition: item.priceAtAddition }));
    return item;
};

const expectServiceError = async (promise, message, statusCode, extra = {}) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode, ...extra });
};

describe('cartService', () => {
    beforeEach(() => {
        uuidv4.mockReturnValue('generated-session');
        Cart.findOne.mockImplementation(async ({ where }) => {
            if (where.userId) return USER_CART;
            if (where.sessionId) return GUEST_CART;
            return null;
        });
        Cart.create.mockImplementation(async (data) => ({ id: 'cart-new', ...data }));
    });

    describe('cart resolution (getOrCreateCart)', () => {
        beforeEach(() => {
            CartItem.findAll.mockResolvedValue([]);
        });

        it('uses the user cart when a userId is present, even if a session id is also sent', async () => {
            const cart = await cartService.getCart('user-1', 'session-1');

            expect(Cart.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
            expect(cart.id).toBe(USER_CART.id);
        });

        it('uses the guest cart for a session id', async () => {
            const cart = await cartService.getCart(undefined, 'session-1');

            expect(Cart.findOne).toHaveBeenCalledWith({ where: { sessionId: 'session-1' } });
            expect(cart.id).toBe(GUEST_CART.id);
        });

        it('creates a user cart when none exists', async () => {
            Cart.findOne.mockResolvedValue(null);

            const cart = await cartService.getCart('user-1');

            expect(Cart.create).toHaveBeenCalledWith({ userId: 'user-1' });
            expect(cart.id).toBe('cart-new');
        });

        it('creates a guest cart when none exists', async () => {
            Cart.findOne.mockResolvedValue(null);

            await cartService.getCart(undefined, 'session-1');

            expect(Cart.create).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-1' }));
        });
    });

    describe('getCart', () => {
        it('rejects when there is neither a user nor a session', async () => {
            await expectServiceError(cartService.getCart(), 'User authentication or session ID required', 400);
            expect(Cart.findOne).not.toHaveBeenCalled();
        });

        it('returns an empty cart with zero totals', async () => {
            CartItem.findAll.mockResolvedValue([]);

            await expect(cartService.getCart('user-1')).resolves.toEqual({
                id: USER_CART.id, items: [], subtotal: '0.00', itemCount: 0
            });
        });

        it('computes subtotal and itemCount, using the variant price when there is one', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({ quantity: 2 }),
                makeCartItem({
                    id: 'item-2',
                    variantId: VARIANT_ID,
                    variant: makeVariant({ price: '19.99' }),
                    priceAtAddition: '19.99',
                    quantity: 3
                })
            ]);

            const cart = await cartService.getCart('user-1');

            // 2 × 100.00 + 3 × 19.99
            expect(cart.subtotal).toBe('259.97');
            expect(cart.itemCount).toBe(5);
        });

        it('falls back to the product price when the variant has no price', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({ variantId: VARIANT_ID, variant: makeVariant({ price: null }), quantity: 2 })
            ]);

            const cart = await cartService.getCart('user-1');

            expect(cart.subtotal).toBe('200.00');
            expect(cart.items[0].currentPrice).toBe('100.00');
        });

        it('only reads items from the resolved cart', async () => {
            CartItem.findAll.mockResolvedValue([]);

            await cartService.getCart('user-1');

            expect(CartItem.findAll.mock.calls[0][0].where).toEqual({ cartId: USER_CART.id });
        });

        it('flags a price change since the item was added', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({
                    variantId: VARIANT_ID,
                    variant: makeVariant({ price: '150.00' }),
                    priceAtAddition: '120.00'
                })
            ]);

            const [item] = (await cartService.getCart('user-1')).items;

            expect(item.priceChanged).toBe(true);
            expect(item.issues).toContain('Price changed from 120.00 to 150.00');
        });

        it('treats equal prices with different formatting as unchanged', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({ variantId: VARIANT_ID, variant: makeVariant({ price: '120' }), priceAtAddition: '120.00' })
            ]);

            const [item] = (await cartService.getCart('user-1')).items;

            expect(item.priceChanged).toBe(false);
        });

        it('flags a product that is no longer active', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({
                    product: makeProduct({ status: 'inactive' }),
                    variantId: VARIANT_ID,
                    variant: makeVariant({ price: '100.00' })
                })
            ]);

            const [item] = (await cartService.getCart('user-1')).items;

            expect(item.issues).toContain('product no longer available');
        });

        it('flags insufficient variant stock and reports what is available', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({
                    quantity: 4,
                    variantId: VARIANT_ID,
                    variant: makeVariant({ stockQuantity: 2, price: '100.00' })
                })
            ]);

            const [item] = (await cartService.getCart('user-1')).items;

            expect(item.availableStock).toBe(2);
            expect(item.issues).toContain('Insufficient stock');
        });

        it('reports no issues for an in-stock variant at the same price', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({ variantId: VARIANT_ID, variant: makeVariant(), priceAtAddition: '120.00' })
            ]);

            const [item] = (await cartService.getCart('user-1')).items;

            expect(item.issues).toEqual([]);
        });
    });

    describe('addToCart', () => {
        beforeEach(() => {
            Product.findOne.mockResolvedValue(makeProduct());
            ProductVariant.findOne.mockResolvedValue(makeVariant());
            CartItem.findOne.mockResolvedValue(null);
            CartItem.create.mockImplementation(async (data) => ({ id: 'item-new', ...data }));
            CartItem.findByPk.mockImplementation(async (id) => ({ id }));
        });

        it('creates a new item at the current product price', async () => {
            const result = await cartService.addToCart({ productId: PRODUCT_ID, quantity: 2 }, 'user-1');

            expect(Product.findOne.mock.calls[0][0].where).toEqual({ id: PRODUCT_ID, status: 'active' });
            expect(CartItem.create).toHaveBeenCalledWith({
                cartId: USER_CART.id,
                productId: PRODUCT_ID,
                variantId: undefined,
                quantity: 2,
                priceAtAddition: '100.00'
            });
            expect(result).toEqual({ cartItem: { id: 'item-new' }, sessionId: undefined });
        });

        it('defaults quantity to 1', async () => {
            await cartService.addToCart({ productId: PRODUCT_ID }, 'user-1');

            expect(CartItem.create.mock.calls[0][0].quantity).toBe(1);
        });

        it('uses the variant price and stock when a variant is given', async () => {
            await cartService.addToCart({ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 5 }, 'user-1');

            expect(ProductVariant.findOne).toHaveBeenCalledWith({
                where: { id: VARIANT_ID, productId: PRODUCT_ID, isActive: true }
            });
            expect(CartItem.create.mock.calls[0][0]).toMatchObject({ variantId: VARIANT_ID, priceAtAddition: '120.00' });
        });

        it('increments an existing line instead of adding a duplicate', async () => {
            const existing = makeCartItem({ quantity: 3 });
            CartItem.findOne.mockResolvedValue(existing);

            await cartService.addToCart({ productId: PRODUCT_ID, quantity: 2 }, 'user-1');

            expect(CartItem.findOne).toHaveBeenCalledWith({
                where: { cartId: USER_CART.id, productId: PRODUCT_ID, variantId: null }
            });
            expect(existing.update).toHaveBeenCalledWith({ quantity: 5, priceAtAddition: '100.00' });
            expect(CartItem.create).not.toHaveBeenCalled();
        });

        it('rejects when the combined quantity would exceed stock', async () => {
            CartItem.findOne.mockResolvedValue(makeCartItem({ quantity: 9 }));

            await expectServiceError(
                cartService.addToCart({ productId: PRODUCT_ID, quantity: 2 }, 'user-1'),
                'Insufficient stock for requested quantity',
                400,
                { code: 'INSUFFICIENT_STOCK', details: { availableStock: 10 } }
            );
        });

        it('rejects when the requested quantity exceeds stock', async () => {
            Product.findOne.mockResolvedValue(makeProduct({ inventory: { availableStock: 1 } }));

            await expectServiceError(
                cartService.addToCart({ productId: PRODUCT_ID, quantity: 2 }, 'user-1'),
                'Insufficient stock',
                400,
                { code: 'INSUFFICIENT_STOCK', details: { availableStock: 1 } }
            );
            expect(CartItem.create).not.toHaveBeenCalled();
        });

        it('treats a product with no inventory record as out of stock', async () => {
            Product.findOne.mockResolvedValue(makeProduct({ inventory: null }));

            await expectServiceError(
                cartService.addToCart({ productId: PRODUCT_ID }, 'user-1'),
                'Insufficient stock',
                400,
                { code: 'INSUFFICIENT_STOCK', details: { availableStock: 0 } }
            );
        });

        it('rejects a missing productId', async () => {
            await expectServiceError(cartService.addToCart({}, 'user-1'), 'Product ID is required', 400);
        });

        it.each([0, -1])('rejects quantity %p', async (quantity) => {
            await expectServiceError(
                cartService.addToCart({ productId: PRODUCT_ID, quantity }, 'user-1'),
                'Quantity must be at least 1',
                400
            );
        });

        it('rejects an inactive or missing product', async () => {
            Product.findOne.mockResolvedValue(null);

            await expectServiceError(
                cartService.addToCart({ productId: PRODUCT_ID }, 'user-1'),
                'Product not found or unavailable',
                404
            );
        });

        it('rejects an unknown or inactive variant', async () => {
            ProductVariant.findOne.mockResolvedValue(null);

            await expectServiceError(
                cartService.addToCart({ productId: PRODUCT_ID, variantId: VARIANT_ID }, 'user-1'),
                'Product variant not found',
                404
            );
        });

        describe('guests', () => {
            it('generates and returns a session id when the guest has none', async () => {
                Cart.findOne.mockResolvedValue(null);

                const result = await cartService.addToCart({ productId: PRODUCT_ID }, undefined, undefined);

                expect(Cart.create).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'generated-session' }));
                expect(result.sessionId).toBe('generated-session');
            });

            it('reuses and returns the existing session id', async () => {
                const result = await cartService.addToCart({ productId: PRODUCT_ID }, undefined, 'session-1');

                expect(uuidv4).not.toHaveBeenCalled();
                expect(result.sessionId).toBe('session-1');
            });

            it('does not return a session id to logged-in users', async () => {
                const result = await cartService.addToCart({ productId: PRODUCT_ID }, 'user-1', 'session-1');

                expect(result.sessionId).toBeUndefined();
            });
        });
    });

    describe('updateCartItem', () => {
        it('sets the new quantity on an item in the caller\'s cart', async () => {
            const item = makeCartItem();
            CartItem.findOne.mockResolvedValue(item);

            const result = await cartService.updateCartItem('item-1', 4, 'user-1');

            expect(CartItem.findOne.mock.calls[0][0].where).toEqual({ id: 'item-1', cartId: USER_CART.id });
            expect(item.update).toHaveBeenCalledWith({ quantity: 4 });
            expect(result).toBe(item);
        });

        it('checks against variant stock when the item has a variant', async () => {
            CartItem.findOne.mockResolvedValue(makeCartItem({ variant: makeVariant({ stockQuantity: 3 }) }));

            await expectServiceError(
                cartService.updateCartItem('item-1', 4, 'user-1'),
                'Insufficient stock',
                400,
                { code: 'INSUFFICIENT_STOCK', details: { availableStock: 3 } }
            );
        });

        it('rejects a quantity above product stock', async () => {
            const item = makeCartItem();
            CartItem.findOne.mockResolvedValue(item);

            await expectServiceError(cartService.updateCartItem('item-1', 11, 'user-1'), 'Insufficient stock', 400);
            expect(item.update).not.toHaveBeenCalled();
        });

        it.each([undefined, 0, -2])('rejects quantity %p', async (quantity) => {
            await expectServiceError(cartService.updateCartItem('item-1', quantity, 'user-1'), 'Valid quantity required', 400);
        });

        it('returns 404 for an item that is not in the caller\'s cart', async () => {
            CartItem.findOne.mockResolvedValue(null);

            await expectServiceError(cartService.updateCartItem('someone-elses', 1, 'user-1'), 'Cart item not found', 404);
        });
    });

    describe('removeCartItem', () => {
        it('deletes an item in the caller\'s cart', async () => {
            const item = makeCartItem();
            CartItem.findOne.mockResolvedValue(item);

            await cartService.removeCartItem('item-1', undefined, 'session-1');

            expect(CartItem.findOne).toHaveBeenCalledWith({ where: { id: 'item-1', cartId: GUEST_CART.id } });
            expect(item.destroy).toHaveBeenCalled();
        });

        it('returns 404 for an item that is not in the caller\'s cart', async () => {
            CartItem.findOne.mockResolvedValue(null);

            await expectServiceError(cartService.removeCartItem('someone-elses', 'user-1'), 'Cart item not found', 404);
        });
    });

    describe('clearCart', () => {
        it('deletes only the items in the caller\'s cart', async () => {
            CartItem.destroy.mockResolvedValue(3);

            await cartService.clearCart('user-1');

            expect(CartItem.destroy).toHaveBeenCalledWith({ where: { cartId: USER_CART.id } });
        });
    });

    describe('validateCart', () => {
        it('is valid when every item is active and unchanged in price', async () => {
            CartItem.findAll.mockResolvedValue([makeCartItem()]);

            await expect(cartService.validateCart('user-1')).resolves.toEqual({
                isValid: true, issues: [], invalidItems: []
            });
        });

        it('is invalid when a product is no longer active', async () => {
            CartItem.findAll.mockResolvedValue([makeCartItem({ product: makeProduct({ status: 'archived' }) })]);

            const result = await cartService.validateCart('user-1');

            expect(result.isValid).toBe(false);
            expect(result.invalidItems).toEqual([
                { itemId: 'item-1', productName: 'Solar Lamp', issues: ['Product no longer available'] }
            ]);
        });

        it('reports a price change as an issue without making the cart invalid', async () => {
            CartItem.findAll.mockResolvedValue([makeCartItem({ priceAtAddition: '80.00' })]);

            const result = await cartService.validateCart('user-1');

            expect(result.isValid).toBe(true);
            expect(result.issues).toEqual(['Price changed from 80.00 to 100.00']);
        });

        it('collects issues across multiple items', async () => {
            CartItem.findAll.mockResolvedValue([
                makeCartItem({ product: makeProduct({ status: 'inactive' }), priceAtAddition: '90.00' }),
                makeCartItem({ id: 'item-2' })
            ]);

            const result = await cartService.validateCart('user-1');

            expect(result.isValid).toBe(false);
            expect(result.invalidItems).toHaveLength(1);
            expect(result.issues).toHaveLength(2);
        });
    });

    describe('mergeCarts', () => {
        const makeGuestCart = (items) => ({
            id: GUEST_CART.id,
            items,
            destroy: jest.fn().mockResolvedValue()
        });

        it('requires a guest session id', async () => {
            await expectServiceError(cartService.mergeCarts('user-1', undefined), 'Guest session ID required', 400);
        });

        it.each([
            ['no guest cart', null],
            ['an empty guest cart', makeGuestCart([])]
        ])('does nothing for %s', async (_, guestCart) => {
            Cart.findOne.mockResolvedValueOnce(guestCart);

            await expect(cartService.mergeCarts('user-1', 'session-1')).resolves.toEqual({ merged: false });
            expect(Cart.create).not.toHaveBeenCalled();
        });

        it('moves new lines to the user cart, sums duplicates, then deletes the guest cart', async () => {
            const duplicate = makeCartItem({ id: 'g1', cartId: GUEST_CART.id, quantity: 2 });
            const fresh = makeCartItem({ id: 'g2', cartId: GUEST_CART.id, productId: 'other-product', quantity: 1 });
            const guestCart = makeGuestCart([duplicate, fresh]);
            const userLine = makeCartItem({ id: 'u1', quantity: 3 });

            Cart.findOne
                .mockResolvedValueOnce(guestCart)
                .mockResolvedValueOnce(USER_CART);
            CartItem.findOne
                .mockResolvedValueOnce(userLine)
                .mockResolvedValueOnce(null);

            await expect(cartService.mergeCarts('user-1', 'session-1')).resolves.toEqual({ merged: true });

            expect(userLine.update).toHaveBeenCalledWith({ quantity: 5 });
            expect(duplicate.update).not.toHaveBeenCalled();
            expect(fresh.update).toHaveBeenCalledWith({ cartId: USER_CART.id });
            expect(guestCart.destroy).toHaveBeenCalled();
        });

        it('creates the user cart if the user has none yet', async () => {
            const guestCart = makeGuestCart([makeCartItem({ cartId: GUEST_CART.id })]);
            Cart.findOne
                .mockResolvedValueOnce(guestCart)
                .mockResolvedValueOnce(null);
            CartItem.findOne.mockResolvedValue(null);

            await cartService.mergeCarts('user-1', 'session-1');

            expect(Cart.create).toHaveBeenCalledWith({ userId: 'user-1' });
            expect(guestCart.items[0].update).toHaveBeenCalledWith({ cartId: 'cart-new' });
        });
    });
});
