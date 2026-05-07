'use strict';

const {
    Order,
    OrderItem,
    OrderStatusHistory,
    OrderCancellation,
    OrderNote,
    Address,
    Product,
    Inventory,
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

const getAllOrders = async ({
    page = 1, limit = 20, status, paymentStatus, userId: filterUserId, vendorId,
    startDate, endDate, minAmount, maxAmount, search
}) => {
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (filterUserId) where.userId = filterUserId;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    if (minAmount || maxAmount) {
        where.totalAmount = {};
        if (minAmount) where.totalAmount[Op.gte] = minAmount;
        if (maxAmount) where.totalAmount[Op.lte] = maxAmount;
    }
    if (search) {
        where[Op.or] = [
            { orderNumber: { [Op.iLike]: `%${search}%` } },
            { '$user.email$': { [Op.iLike]: `%${search}%` } },
            { '$user.firstName$': { [Op.iLike]: `%${search}%` } },
            { '$user.lastName$': { [Op.iLike]: `%${search}%` } }
        ];
    }

    const include = [
        {
            model: OrderItem,
            as: 'items',
            ...(vendorId && { where: { vendorId } })
        },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
    ];

    const { count, rows: orders } = await Order.findAndCountAll({
        where,
        include,
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

const getOrderById = async (id) => {
    const order = await Order.findByPk(id, {
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [
                    { model: Product, as: 'product' },
                    { model: User, as: 'vendor', attributes: ['id', 'firstName', 'lastName', 'email'] }
                ]
            },
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
            { model: Address, as: 'shippingAddress' },
            { model: Address, as: 'billingAddress' },
            {
                model: OrderNote,
                as: 'notes',
                include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'role'] }],
                order: [['created_at', 'DESC']]
            }
        ]
    });

    if (!order) throw createError('Order not found', 404);
    return order;
};

const updateOrderStatus = async (id, adminId, { status, reason }) => {
    if (!status) throw createError('Status is required', 400);

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) throw createError('Invalid status', 400);

    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findByPk(id, {
            include: [
                { model: User, as: 'user' },
                { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }
            ],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            throw createError('Order not found', 404);
        }

        const oldStatus = order.status;

        if (status === 'cancelled') {
            for (const item of order.items) {
                const inventory = await Inventory.findOne({ where: { productId: item.productId }, transaction });
                if (inventory) {
                    await inventory.update({
                        reservedStock: inventory.reservedStock - item.quantity,
                        availableStock: inventory.availableStock + item.quantity
                    }, { transaction });
                }
            }
            order.cancelled_at = new Date();
        }

        if (status === 'confirmed' && oldStatus === 'pending') order.confirmed_at = new Date();
        if (status === 'shipped' && oldStatus !== 'shipped') order.shipped_at = new Date();
        if (status === 'delivered' && oldStatus !== 'delivered') order.delivered_at = new Date();

        await order.update({ status }, { transaction });
        await recordStatusChange(id, oldStatus, status, adminId, reason || 'Admin update', transaction);
        await transaction.commit();

        emailService.sendOrderStatusUpdateNotification(order.user.email, order.user.firstName, status)
            .catch(err => console.error('Email send failed:', err));

        return order;
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        throw error;
    }
};

const confirmOrder = async (id, adminId, paymentReference) => {
    const order = await Order.findByPk(id, {
        include: [{ model: User, as: 'user' }]
    });

    if (!order) throw createError('Order not found', 404);

    if (order.status !== 'pending') {
        const err = createError('Only pending orders can be confirmed', 400);
        err.currentStatus = order.status;
        throw err;
    }

    const oldStatus = order.status;
    await order.update({
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentReference,
        confirmed_at: new Date()
    });

    await recordStatusChange(id, oldStatus, 'confirmed', adminId, 'Payment verified by admin');

    emailService.sendOrderConfirmedNotification(
        order.user.email,
        order.user.firstName,
        order.orderNumber
    ).catch(err => console.error('Email send failed:', err));

    return order;
};

const getOrderHistory = async (id) => {
    const history = await OrderStatusHistory.findAll({
        where: { orderId: id },
        include: [{ model: User, as: 'changedBy', attributes: ['id', 'firstName', 'lastName', 'role'] }],
        order: [['created_at', 'ASC']]
    });

    return history;
};

const getCancellationRequests = async (status = 'pending') => {
    const requests = await OrderCancellation.findAll({
        where: { type: 'cancellation', status },
        include: [
            {
                model: Order,
                as: 'order',
                include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            },
            { model: User, as: 'requestedBy', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [['requested_at', 'DESC']]
    });

    return requests;
};

const processCancellation = async (id, adminId, { action, adminNotes }) => {
    if (!['approve', 'reject'].includes(action)) {
        throw createError('Action must be approve or reject', 400);
    }

    const transaction = await sequelize.transaction();

    try {
        const cancellation = await OrderCancellation.findByPk(id, {
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }
                    ]
                }
            ],
            transaction
        });

        if (!cancellation) {
            await transaction.rollback();
            throw createError('Cancellation request not found', 404);
        }

        if (cancellation.status !== 'pending') {
            await transaction.rollback();
            throw createError('Request already processed', 400);
        }

        if (action === 'approve') {
            const order = cancellation.order;

            for (const item of order.items) {
                const inventory = await Inventory.findOne({ where: { productId: item.productId }, transaction });
                if (inventory) {
                    await inventory.update({
                        reservedStock: inventory.reservedStock - item.quantity,
                        availableStock: inventory.availableStock + item.quantity
                    }, { transaction });
                }
            }

            const oldStatus = order.status;
            await order.update({ status: 'cancelled', cancelled_at: new Date() }, { transaction });
            await recordStatusChange(
                order.id, oldStatus, 'cancelled', adminId,
                `Cancellation approved: ${cancellation.reason}`, transaction
            );

            await cancellation.update({
                status: 'approved',
                processedByUserId: adminId,
                adminNotes,
                processed_at: new Date(),
                refundAmount: order.paymentStatus === 'paid' ? order.totalAmount : 0,
                refundMethod: 'original_payment'
            }, { transaction });

            await transaction.commit();

            emailService.sendCancellationApprovedNotification(
                order.user.email, order.user.firstName, order.orderNumber
            ).catch(err => console.error('Email send failed:', err));
        } else {
            await cancellation.update({
                status: 'rejected',
                processedByUserId: adminId,
                adminNotes,
                processed_at: new Date()
            }, { transaction });

            await transaction.commit();
        }

        return cancellation;
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        throw error;
    }
};

const getReturnRequests = async (status = 'pending') => {
    const requests = await OrderCancellation.findAll({
        where: { type: 'return', status },
        include: [
            {
                model: Order,
                as: 'order',
                include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            },
            { model: User, as: 'requestedBy', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [['requested_at', 'DESC']]
    });

    return requests;
};

const processReturn = async (id, adminId, { action, adminNotes, refundAmount }) => {
    if (!['approve', 'reject'].includes(action)) {
        throw createError('Action must be approve or reject', 400);
    }

    const returnRequest = await OrderCancellation.findByPk(id, {
        include: [{ model: Order, as: 'order', include: [{ model: User, as: 'user' }] }]
    });

    if (!returnRequest) throw createError('Return request not found', 404);
    if (returnRequest.status !== 'pending') throw createError('Request already processed', 400);

    if (action === 'approve') {
        await returnRequest.update({
            status: 'approved',
            processedByUserId: adminId,
            adminNotes,
            refundAmount: refundAmount || returnRequest.order.totalAmount,
            refundMethod: 'original_payment',
            processed_at: new Date()
        });
    } else {
        await returnRequest.update({
            status: 'rejected',
            processedByUserId: adminId,
            adminNotes,
            processed_at: new Date()
        });
    }

    return returnRequest;
};

const processRefund = async (id, adminId, { refundAmount, refundMethod = 'original_payment', notes }) => {
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findByPk(id, {
            include: [{ model: User, as: 'user' }],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            throw createError('Order not found', 404);
        }

        if (order.paymentStatus !== 'paid') {
            await transaction.rollback();
            throw createError('Order has not been paid', 400);
        }

        const amount = refundAmount || order.totalAmount;
        const oldStatus = order.status;

        await order.update({ status: 'refunded', paymentStatus: 'refunded' }, { transaction });

        await OrderCancellation.create({
            orderId: id,
            type: 'refund',
            status: 'completed',
            reason: notes || 'Refund processed by admin',
            requestedByUserId: adminId,
            processedByUserId: adminId,
            refundAmount: amount,
            refundMethod,
            adminNotes: notes,
            requestedAt: new Date(),
            processedAt: new Date()
        }, { transaction });

        await recordStatusChange(id, oldStatus, 'refunded', adminId, `Refund processed: ${amount}`, transaction);
        await transaction.commit();

        emailService.sendRefundProcessedNotification(
            order.user.email, order.user.firstName, order.orderNumber, amount
        ).catch(err => console.error('Email send failed:', err));

        return order;
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        throw error;
    }
};

const addAdminNote = async (id, adminId, { content, isVisibleToCustomer = false }) => {
    if (!content) throw createError('Note content is required', 400);

    const note = await OrderNote.create({
        orderId: id,
        userId: adminId,
        noteType: 'admin_note',
        content,
        isVisibleToCustomer
    });

    return note;
};

const getAdminDashboardStats = async () => {
    const totalOrders = await Order.count();
    const totalRevenue = await Order.sum('totalAmount', { where: { paymentStatus: 'paid' } });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ordersToday = await Order.count({ where: { createdAt: { [Op.gte]: startOfDay } } });
    const revenueToday = await Order.sum('totalAmount', {
        where: { paymentStatus: 'paid', createdAt: { [Op.gte]: startOfDay } }
    });

    const ordersByStatus = await Order.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true
    });

    const ordersByPaymentStatus = await Order.findAll({
        attributes: ['paymentStatus', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['paymentStatus'],
        raw: true
    });

    const pendingCancellations = await OrderCancellation.count({ where: { type: 'cancellation', status: 'pending' } });
    const pendingReturns = await OrderCancellation.count({ where: { type: 'return', status: 'pending' } });

    return {
        totalOrders,
        totalRevenue: totalRevenue || 0,
        ordersToday,
        revenueToday: revenueToday || 0,
        ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: parseInt(o.count) })),
        ordersByPaymentStatus: ordersByPaymentStatus.map(o => ({
            paymentStatus: o.paymentStatus,
            count: parseInt(o.count)
        })),
        pendingActions: { cancellations: pendingCancellations, returns: pendingReturns }
    };
};

module.exports = {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    confirmOrder,
    getOrderHistory,
    getCancellationRequests,
    processCancellation,
    getReturnRequests,
    processReturn,
    processRefund,
    addAdminNote,
    getAdminDashboardStats
};
