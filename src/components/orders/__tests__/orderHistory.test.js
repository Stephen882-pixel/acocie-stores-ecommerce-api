jest.mock('../../../models', () => ({
    Order: { findAndCountAll: jest.fn() },
    OrderItem: {},
    OrderTracking: {},
    OrderCancellation: {},
    OrderNote: {},
    Address: {},
    Product: {},
    User: {},
    sequelize: {}
}));
jest.mock('../../auth/services/emailService', () => ({}));

const { Order } = require('../../../models');
const orderService = require('../services/orderService');

describe('orderService.getOrderHistory', () => {
    it('counts orders, not order × item rows, so pagination is right', async () => {
        Order.findAndCountAll.mockResolvedValue({ count: 2, rows: [] });

        const { pagination } = await orderService.getOrderHistory('user-1', { page: 1, limit: 20 });

        expect(Order.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ distinct: true }));
        expect(pagination).toMatchObject({ total: 2, totalPages: 1 });
    });
});
