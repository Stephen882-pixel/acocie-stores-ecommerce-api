'use strict';

const {
    Order,
    OrderItem,
    OrderTracking,
    OrderCancellation,
    OrderNote,
    Address,
    Product,
    User,
    sequelize
} = require('../../../models');
const { Op } = require('sequelize');
const emailService = require('../../auth/services/emailService');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getOrderHistory = async (userId, { page = 1, limit = 20, status, startDate, endDate }) => {
    const offset = (page - 1) * limit;
    const where = { userId };

    if (status) where.status = status;
    if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    const { count, rows: orders } = await Order.findAndCountAll({
        where,
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug'] }]
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    });

    return {
        orders,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
        }
    };
};

const getOrderById = async (id, userId) => {
    const order = await Order.findOne({
        where: { id, userId },
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [
                    { model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'status'] },
                    { model: User, as: 'vendor', attributes: ['id', 'firstName', 'lastName', 'email'] }
                ]
            },
            { model: Address, as: 'shippingAddress' },
            { model: Address, as: 'billingAddress' },
            { model: OrderTracking, as: 'tracking', required: false },
            {
                model: OrderNote,
                as: 'orderNotes',
                where: {
                    [Op.or]: [{ isVisibleToCustomer: true }, { userId }]
                },
                required: false,
                include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'role'] }],
                order: [['created_at', 'DESC']]
            }
        ]
    });

    if (!order) throw createError('Order not found', 404);
    return order;
};

const getOrderByNumber = async (orderNumber, userId) => {
    const order = await Order.findOne({
        where: { orderNumber, userId },
        include: [
            { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
            { model: Address, as: 'shippingAddress' },
            { model: OrderTracking, as: 'tracking', required: false }
        ]
    });

    if (!order) throw createError('Order not found', 404);
    return order;
};

const getOrderTracking = async (id, userId) => {
    const order = await Order.findOne({ where: { id, userId } });
    if (!order) throw createError('Order not found', 404);

    const tracking = await OrderTracking.findOne({ where: { orderId: id } });
    if (!tracking) throw createError('Tracking information not available yet', 404);

    return tracking;
};

const requestOrderCancellation = async (id, userId, reason) => {
    if (!reason) throw createError('Cancellation reason is required', 400);

    const order = await Order.findOne({ where: { id, userId } });
    if (!order) throw createError('Order not found', 404);

    if (!['pending', 'confirmed'].includes(order.status)) {
        const err = createError('Order cannot be cancelled at this stage', 400);
        err.currentStatus = order.status;
        throw err;
    }

    const existing = await OrderCancellation.findOne({
        where: { orderId: id, type: 'cancellation', status: 'pending' }
    });
    if (existing) throw createError('Cancellation request already pending', 400);

    const cancellation = await OrderCancellation.create({
        orderId: id,
        type: 'cancellation',
        status: 'pending',
        reason,
        requestedByUserId: userId
    });

    emailService.sendCancellationRequestNotification(order.orderNumber, reason)
        .catch(err => console.error('Email send failed:', err));

    return cancellation;
};

const requestReturn = async (id, userId, reason) => {
    if (!reason) throw createError('Return reason is required', 400);

    const order = await Order.findOne({ where: { id, userId } });
    if (!order) throw createError('Order not found', 404);

    if (order.status !== 'delivered') throw createError('Only delivered orders can be returned', 400);

    const daysSinceDelivery = Math.floor(
        (new Date() - new Date(order.deliveredAt)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDelivery > 14) {
        throw createError('Return window has expired (14 days from delivery)', 400);
    }

    const existing = await OrderCancellation.findOne({
        where: { orderId: id, type: 'return', status: 'pending' }
    });
    if (existing) throw createError('Return request already pending', 400);

    const returnRequest = await OrderCancellation.create({
        orderId: id,
        type: 'return',
        status: 'pending',
        reason,
        requestedByUserId: userId
    });

    return returnRequest;
};

const addCustomerNote = async (id, userId, content) => {
    if (!content) throw createError('Note content is required', 400);

    const order = await Order.findOne({ where: { id, userId } });
    if (!order) throw createError('Order not found', 404);

    const note = await OrderNote.create({
        orderId: id,
        userId,
        noteType: 'customer_note',
        content,
        isVisibleToCustomer: true
    });

    const completeNote = await OrderNote.findByPk(note.id, {
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }]
    });

    return completeNote;
};

const getOrderStats = async (userId) => {
    const totalOrders = await Order.count({ where: { userId } });

    const totalSpent = await Order.sum('totalAmount', {
        where: { userId, paymentStatus: 'paid' }
    });

    const ordersByStatus = await Order.findAll({
        where: { userId },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status']
    });

    const recentOrders = await Order.findAll({
        where: { userId },
        limit: 5,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'orderNumber', 'status', 'totalAmount', 'created_at']
    });

    return {
        totalOrders,
        totalSpent: totalSpent || 0,
        ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: parseInt(o.get('count')) })),
        recentOrders
    };
};

module.exports = {
    getOrderHistory,
    getOrderById,
    getOrderByNumber,
    getOrderTracking,
    requestOrderCancellation,
    requestReturn,
    addCustomerNote,
    getOrderStats
};
