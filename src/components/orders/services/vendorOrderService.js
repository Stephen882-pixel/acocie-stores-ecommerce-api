'use strict';

const {
    Order,
    OrderItem,
    OrderStatusHistory,
    OrderTracking,
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

const recordStatusChange = async (orderId, oldStatus, newStatus, userId, reason = null, transaction = null) => {
    await OrderStatusHistory.create({
        orderId,
        oldStatus,
        newStatus,
        changedByUserId: userId,
        changeReason: reason
    }, transaction ? { transaction } : {});
};

const getVendorOrders = async (vendorId, { page = 1, limit = 20, status, startDate, endDate }) => {
    const offset = (page - 1) * limit;
    const where = {};

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
                where: { vendorId },
                required: true,
                include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug'] }]
            },
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        distinct: true
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

const getVendorOrderById = async (id, vendorId) => {
    const order = await Order.findOne({
        where: { id },
        include: [
            {
                model: OrderItem,
                as: 'items',
                where: { vendorId },
                required: true,
                include: [{ model: Product, as: 'product' }]
            },
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
            { model: Address, as: 'shippingAddress' },
            { model: OrderTracking, as: 'tracking', required: false }
        ]
    });

    if (!order) throw createError('Order not found or no items from your store', 404);
    return order;
};

const acceptOrder = async (id, vendorId) => {
    const order = await Order.findOne({
        where: { id },
        include: [
            { model: OrderItem, as: 'items', where: { vendorId }, required: true },
            { model: User, as: 'user' }
        ]
    });

    if (!order) throw createError('Order not found', 404);

    if (order.status !== 'confirmed') {
        const err = createError('Order must be in confirmed status to accept', 400);
        err.currentStatus = order.status;
        throw err;
    }

    const oldStatus = order.status;
    await order.update({ status: 'processing' });
    await recordStatusChange(id, oldStatus, 'processing', vendorId, 'Vendor accepted order');

    emailService.sendOrderProcessingNotification(
        order.user.email,
        order.user.firstName,
        order.orderNumber
    ).catch(err => console.error('Email send failed:', err));

    return order;
};

const shipOrder = async (id, vendorId, { carrier, trackingNumber, trackingUrl, estimatedDelivery }) => {
    if (!carrier || !trackingNumber) {
        throw createError('Carrier and tracking number are required', 400);
    }

    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findOne({
            where: { id },
            include: [
                { model: OrderItem, as: 'items', where: { vendorId }, required: true },
                { model: User, as: 'user' }
            ],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            throw createError('Order not found', 404);
        }

        if (order.status !== 'processing') {
            await transaction.rollback();
            const err = createError('Order must be in processing status to ship', 400);
            err.currentStatus = order.status;
            throw err;
        }

        const oldStatus = order.status;
        await order.update({ status: 'shipped', shippedAt: new Date() }, { transaction });

        await OrderTracking.create({
            orderId: id,
            carrier,
            trackingNumber,
            trackingUrl,
            estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
            trackingStatus: 'in_transit'
        }, { transaction });

        await recordStatusChange(
            id, oldStatus, 'shipped', vendorId,
            `Shipped via ${carrier}, tracking: ${trackingNumber}`,
            transaction
        );

        await transaction.commit();

        emailService.sendOrderShippedNotification(
            order.user.email,
            order.user.firstName,
            order.orderNumber,
            trackingNumber,
            carrier
        ).catch(err => console.error('Email send failed:', err));

        return order;
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        throw error;
    }
};

const markAsDelivered = async (id, vendorId) => {
    const order = await Order.findOne({
        where: { id },
        include: [
            { model: OrderItem, as: 'items', where: { vendorId }, required: true },
            { model: User, as: 'user' }
        ]
    });

    if (!order) throw createError('Order not found', 404);

    if (order.status !== 'shipped') {
        const err = createError('Order must be in shipped status', 400);
        err.currentStatus = order.status;
        throw err;
    }

    const oldStatus = order.status;
    await order.update({ status: 'delivered', deliveredAt: new Date() });
    await recordStatusChange(id, oldStatus, 'delivered', vendorId, 'Vendor confirmed delivery');

    await OrderTracking.update({ trackingStatus: 'delivered' }, { where: { orderId: id } });

    emailService.sendOrderDeliveredNotification(
        order.user.email,
        order.user.firstName,
        order.orderNumber
    ).catch(err => console.error('Email send failed:', err));

    return order;
};

const updateTracking = async (id, vendorId, { currentLocation, trackingStatus, estimatedDelivery }) => {
    const order = await Order.findOne({
        where: { id },
        include: [{ model: OrderItem, as: 'items', where: { vendorId }, required: true }]
    });

    if (!order) throw createError('Order not found', 404);

    const tracking = await OrderTracking.findOne({ where: { orderId: id } });
    if (!tracking) throw createError('Tracking information not found', 404);

    await tracking.update({
        currentLocation: currentLocation || tracking.currentLocation,
        trackingStatus: trackingStatus || tracking.trackingStatus,
        estimatedDelivery: estimatedDelivery || tracking.estimatedDelivery,
        lastUpdated: new Date()
    });

    return tracking;
};

const addVendorNote = async (id, vendorId, { content, isVisibleToCustomer = true }) => {
    if (!content) throw createError('Note content is required', 400);

    const order = await Order.findOne({
        where: { id },
        include: [{ model: OrderItem, as: 'items', where: { vendorId }, required: true }]
    });

    if (!order) throw createError('Order not found', 404);

    const note = await OrderNote.create({
        orderId: id,
        userId: vendorId,
        noteType: 'vendor_note',
        content,
        isVisibleToCustomer
    });

    return note;
};

const getVendorDashboardStats = async (vendorId) => {
    const totalOrders = await OrderItem.count({
        where: { vendorId },
        distinct: true,
        col: 'orderId'
    });

    const revenueData = await OrderItem.findAll({
        where: { vendorId },
        include: [{ model: Order, as: 'order', where: { status: 'delivered' }, attributes: [] }],
        attributes: [[sequelize.fn('SUM', sequelize.col('OrderItem.subtotal')), 'totalRevenue']],
        raw: true
    });

    const totalRevenue = parseFloat(revenueData[0]?.totalRevenue || 0);

    const pendingData = await OrderItem.findAll({
        where: { vendorId },
        include: [
            {
                model: Order,
                as: 'order',
                where: { status: { [Op.in]: ['pending', 'confirmed', 'processing', 'shipped'] } },
                attributes: []
            }
        ],
        attributes: [[sequelize.fn('SUM', sequelize.col('OrderItem.subtotal')), 'pendingRevenue']],
        raw: true
    });

    const pendingRevenue = parseFloat(pendingData[0]?.pendingRevenue || 0);

    const ordersByStatus = await Order.findAll({
        include: [{ model: OrderItem, as: 'items', where: { vendorId }, attributes: [], required: true }],
        attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Order.id'))), 'count']
        ],
        group: ['status'],
        raw: true
    });

    const recentOrders = await Order.findAll({
        include: [{ model: OrderItem, as: 'items', where: { vendorId }, required: true }],
        limit: 5,
        order: [['created_at', 'DESC']],
        distinct: true
    });

    return {
        totalOrders,
        totalRevenue,
        pendingRevenue,
        ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: parseInt(o.count) })),
        recentOrders
    };
};

module.exports = {
    getVendorOrders,
    getVendorOrderById,
    acceptOrder,
    shipOrder,
    markAsDelivered,
    updateTracking,
    addVendorNote,
    getVendorDashboardStats
};
