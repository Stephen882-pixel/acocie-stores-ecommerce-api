/**
 * Every order status change tells the customer live (order.status_changed),
 * inside the same transaction as the change; and a cancelled order's stock
 * is put back exactly as placeOrder took it.
 */
jest.mock('../../../models', () => ({
    Order: { findOne: jest.fn(), findByPk: jest.fn() },
    OrderItem: {},
    OrderStatusHistory: { create: jest.fn() },
    OrderTracking: { create: jest.fn(), update: jest.fn() },
    OrderCancellation: { findByPk: jest.fn() },
    OrderNote: {},
    Address: {},
    Product: {},
    Inventory: { findOne: jest.fn() },
    ProductVariant: { increment: jest.fn() },
    User: {},
    sequelize: { transaction: jest.fn() }
}));
jest.mock('../../auth/services/emailService', () => new Proxy({}, {
    get: () => jest.fn().mockResolvedValue(true)
}));
jest.mock('../../events/services/eventService', () => ({ record: jest.fn() }));

const { Order, OrderCancellation, Inventory, ProductVariant, sequelize } = require('../../../models');
const eventService = require('../../events/services/eventService');
const vendorOrderService = require('../services/vendorOrderService');
const adminOrderService = require('../services/adminOrderService');

const makeOrder = (status) => ({
    id: 'order-1',
    orderNumber: 'ORD-202611-00001',
    userId: 'customer-1',
    status,
    paymentStatus: 'pending',
    user: { email: 'jane@example.com', firstName: 'Jane' },
    update: jest.fn()
});

const statusEvent = (from, to) => ({
    event: 'order.status_changed',
    to: { userIds: ['customer-1'] },
    data: { orderId: 'order-1', orderNumber: 'ORD-202611-00001', from, to }
});

describe('order status changes', () => {
    let tx;

    beforeEach(() => {
        tx = { finished: undefined, commit: jest.fn(), rollback: jest.fn() };
        // Both forms: sequelize.transaction(callback) and await sequelize.transaction().
        sequelize.transaction.mockImplementation(async (callback) => (callback ? callback(tx) : tx));
    });

    it.each([
        ['vendor accepts', 'confirmed', 'processing', () => vendorOrderService.acceptOrder('order-1', 'vendor-1')],
        ['vendor ships', 'processing', 'shipped', () =>
            vendorOrderService.shipOrder('order-1', 'vendor-1', { carrier: 'DHL', trackingNumber: 'T1' })],
        ['vendor delivers', 'shipped', 'delivered', () => vendorOrderService.markAsDelivered('order-1', 'vendor-1')]
    ])('%s: records the event in the change\'s transaction', async (_label, from, to, act) => {
        Order.findOne.mockResolvedValue(makeOrder(from));

        await act();

        expect(eventService.record).toHaveBeenCalledWith(tx, expect.objectContaining(statusEvent(from, to)));
    });

    it('admin confirms: records the event in the change\'s transaction', async () => {
        Order.findByPk.mockResolvedValue(makeOrder('pending'));

        await adminOrderService.confirmOrder('order-1', 'admin-1', 'REF-1');

        expect(eventService.record).toHaveBeenCalledWith(tx, expect.objectContaining(statusEvent('pending', 'confirmed')));
    });

    describe('approving a cancellation', () => {
        const items = [
            { productId: 'p1', variantId: null, quantity: 2 },
            { productId: 'p2', variantId: 'var-1', quantity: 1 }
        ];

        beforeEach(() => {
            OrderCancellation.findByPk.mockResolvedValue({
                status: 'pending',
                reason: 'Changed my mind',
                order: { ...makeOrder('confirmed'), items },
                update: jest.fn()
            });
        });

        it('puts back available and total stock, and the variant stock', async () => {
            const inventory = { availableStock: 5, totalStock: 8, update: jest.fn() };
            Inventory.findOne.mockResolvedValue(inventory);

            await adminOrderService.processCancellation('c-1', 'admin-1', { action: 'approve' });

            expect(inventory.update).toHaveBeenCalledWith({ availableStock: 7, totalStock: 10 }, { transaction: tx });
            expect(ProductVariant.increment).toHaveBeenCalledWith('stockQuantity', {
                by: 1, where: { id: 'var-1' }, transaction: tx
            });
        });

        it('tells the customer, and loads them so the email after commit does not crash', async () => {
            Inventory.findOne.mockResolvedValue(null);

            // Resolves: before the fix, reading order.user.email after commit threw.
            await adminOrderService.processCancellation('c-1', 'admin-1', { action: 'approve' });

            expect(eventService.record).toHaveBeenCalledWith(tx, expect.objectContaining(statusEvent('confirmed', 'cancelled')));
            const orderInclude = OrderCancellation.findByPk.mock.calls[0][1].include[0].include;
            expect(orderInclude).toEqual(expect.arrayContaining([expect.objectContaining({ as: 'user' })]));
        });
    });
});
