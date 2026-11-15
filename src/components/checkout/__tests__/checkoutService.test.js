/**
 * checkoutService: stock is checked by initiate (which holds nothing) and is
 * checked again and deducted by placeOrder, inside its transaction.
 */
jest.mock('../../../models', () => ({
    Cart: { findOne: jest.fn() },
    CartItem: { destroy: jest.fn() },
    Order: { create: jest.fn(), findAll: jest.fn(), generateOrderNumber: jest.fn() },
    OrderItem: { create: jest.fn() },
    Product: {},
    ProductVariant: {},
    Inventory: {},
    Address: { findOne: jest.fn(), findAll: jest.fn() },
    User: { findByPk: jest.fn() },
    sequelize: { transaction: jest.fn() }
}));
jest.mock('../../auth/services/emailService', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../events/services/eventService', () => ({ record: jest.fn() }));

const { Cart, CartItem, Order, OrderItem, Address, User, sequelize } = require('../../../models');
const checkoutService = require('../services/checkoutService');

const makeTransaction = () => {
    const tx = { finished: undefined };
    tx.commit = jest.fn(async () => { tx.finished = 'commit'; });
    tx.rollback = jest.fn(async () => { tx.finished = 'rollback'; });
    return tx;
};

const makeInventory = (availableStock = 10) => ({
    availableStock, totalStock: availableStock, reservedStock: 0, update: jest.fn()
});

// A cart line for a product without variants.
const plainItem = (overrides = {}) => ({
    productId: 'p1',
    variantId: null,
    quantity: 2,
    variant: null,
    product: {
        id: 'p1', name: 'Kettle', price: '100.00', sku: 'KET', status: 'active',
        vendorId: 'v1', lowStockThreshold: 3, inventory: makeInventory(10),
        increment: jest.fn()
    },
    ...overrides
});

// A cart line for a product variant, which has its own stock.
const variantItem = (stockQuantity = 5) => ({
    productId: 'p2',
    variantId: 'var1',
    quantity: 1,
    variant: { id: 'var1', name: '128GB', sku: 'PH-128', price: '500.00', stockQuantity, decrement: jest.fn() },
    product: {
        id: 'p2', name: 'Phone', price: '450.00', sku: 'PH', status: 'active',
        vendorId: 'v2', lowStockThreshold: 3, inventory: makeInventory(20),
        increment: jest.fn()
    }
});

const cartWith = (...items) => ({ id: 'cart-1', items });

describe('checkoutService', () => {
    let tx;

    beforeEach(() => {
        tx = makeTransaction();
        sequelize.transaction.mockResolvedValue(tx);
        Address.findOne.mockResolvedValue({ id: 'addr-1' });
        let orderCount = 0;
        Order.generateOrderNumber.mockImplementation(async () => `ORD-202611-0000${++orderCount}`);
        Order.create.mockImplementation(async (data) => ({ id: `order-${orderCount}`, ...data }));
        Order.findAll.mockImplementation(async ({ where }) => where.id.map((id) => ({ id })));
        Address.findAll.mockResolvedValue([]);
        User.findByPk.mockResolvedValue({ email: 'jane@example.com', firstName: 'Jane' });
    });

    describe('initiateCheckout', () => {
        it('accepts an orderable cart without holding any stock', async () => {
            const item = plainItem();
            Cart.findOne.mockResolvedValue(cartWith(item));

            await expect(checkoutService.initiateCheckout('user-1')).resolves.toEqual({ cartId: 'cart-1', itemCount: 1 });
            expect(item.product.inventory.update).not.toHaveBeenCalled();
        });

        it('lists every line that cannot be ordered', async () => {
            Cart.findOne.mockResolvedValue(cartWith(
                plainItem({ quantity: 50 }),
                variantItem(0)
            ));

            await expect(checkoutService.initiateCheckout('user-1')).rejects.toMatchObject({
                statusCode: 400,
                code: 'INSUFFICIENT_STOCK',
                details: ['Kettle: Only 10 in stock', 'Phone: Only 0 in stock']
            });
        });

        it('rejects an empty cart', async () => {
            Cart.findOne.mockResolvedValue(cartWith());
            await expect(checkoutService.initiateCheckout('user-1')).rejects.toMatchObject({ message: 'Cart is empty', statusCode: 400 });
        });
    });

    describe('getCheckoutSummary', () => {
        it('prices the cart as the per-seller orders it will become', async () => {
            Cart.findOne.mockResolvedValue(cartWith(plainItem(), variantItem()));

            const summary = await checkoutService.getCheckoutSummary('user-1');

            expect(summary).toMatchObject({
                sellerCount: 2,
                subtotal: '700.00',
                taxAmount: '112.00',
                shippingCost: '20.00',
                totalAmount: '832.00'
            });
        });
    });

    describe('placeOrder', () => {
        it('deducts available and total stock, and the variant stock, then clears the cart', async () => {
            const plain = plainItem();
            const withVariant = variantItem(5);
            Cart.findOne.mockResolvedValue(cartWith(plain, withVariant));

            await checkoutService.placeOrder('user-1', { shippingAddressId: 'addr-1' });

            expect(plain.product.inventory.update).toHaveBeenCalledWith(
                expect.objectContaining({ availableStock: 8, totalStock: 8 }), { transaction: tx }
            );
            expect(plain.product.inventory.update.mock.calls[0][0]).not.toHaveProperty('reservedStock');
            expect(withVariant.variant.decrement).toHaveBeenCalledWith('stockQuantity', { by: 1, transaction: tx });
            expect(CartItem.destroy).toHaveBeenCalledWith({ where: { cartId: 'cart-1' }, transaction: tx });
            expect(tx.commit).toHaveBeenCalled();
        });

        it('uses the variant price and records each line against its vendor', async () => {
            Cart.findOne.mockResolvedValue(cartWith(variantItem()));

            await checkoutService.placeOrder('user-1', { shippingAddressId: 'addr-1' });

            expect(OrderItem.create).toHaveBeenCalledWith(
                expect.objectContaining({ vendorId: 'v2', unitPrice: '500.00', sku: 'PH-128' }), { transaction: tx }
            );
        });

        it('re-checks stock and changes nothing when it has run out since checkout began', async () => {
            const item = plainItem({ quantity: 11 });
            Cart.findOne.mockResolvedValue(cartWith(item));

            await expect(checkoutService.placeOrder('user-1', { shippingAddressId: 'addr-1' }))
                .rejects.toMatchObject({ statusCode: 400, code: 'INSUFFICIENT_STOCK' });

            expect(Order.create).not.toHaveBeenCalled();
            expect(item.product.inventory.update).not.toHaveBeenCalled();
            expect(tx.rollback).toHaveBeenCalled();
        });

        it('places one order per seller, each with its own number and delivery fee', async () => {
            Cart.findOne.mockResolvedValue(cartWith(plainItem(), variantItem()));

            const result = await checkoutService.placeOrder('user-1', { shippingAddressId: 'addr-1' });

            expect(Order.create).toHaveBeenCalledTimes(2);
            const [kettleOrder, phoneOrder] = Order.create.mock.calls.map(([data]) => data);
            // Kettle: 2 × 100 + 16% VAT + 10 delivery. Phone: 1 × 500 + 16% VAT + 10.
            expect(kettleOrder).toMatchObject({ orderNumber: 'ORD-202611-00001', subtotal: '200.00', shippingCost: '10.00', totalAmount: '242.00' });
            expect(phoneOrder).toMatchObject({ orderNumber: 'ORD-202611-00002', subtotal: '500.00', shippingCost: '10.00', totalAmount: '590.00' });
            // Order numbers are counted inside the transaction, so they cannot collide.
            expect(Order.generateOrderNumber).toHaveBeenCalledWith(tx);
            expect(result.orders).toHaveLength(2);
        });

        it('keeps a single-seller cart as one order', async () => {
            Cart.findOne.mockResolvedValue(cartWith(plainItem(), plainItem({ productId: 'p3' })));

            await checkoutService.placeOrder('user-1', { shippingAddressId: 'addr-1' });

            expect(Order.create).toHaveBeenCalledTimes(1);
        });

        it("rejects an address that is not the user's", async () => {
            Address.findOne.mockResolvedValue(null);

            await expect(checkoutService.placeOrder('user-1', { shippingAddressId: 'someone-elses' }))
                .rejects.toMatchObject({ message: 'Shipping address not found', statusCode: 404 });
            expect(Address.findOne).toHaveBeenCalledWith({ where: { id: 'someone-elses', userId: 'user-1' } });
        });
    });
});
