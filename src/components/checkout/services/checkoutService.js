'use strict';

const {
    Cart,
    CartItem,
    Order,
    OrderItem,
    Product,
    ProductVariant,
    Inventory,
    Address,
    User,
    sequelize
} = require('../../../models');
const emailService = require('../../auth/services/emailService');
const eventService = require('../../events/services/eventService');
const { EVENTS, LEVELS } = require('../../events/constants/events');

const { createError } = require('../../../helpers/error.helper');

const calculateOrderTotals = (items, shippingCost = 0, taxRate = 0.16) => {
    const subtotal = items.reduce((sum, item) => {
        return sum + (parseFloat(item.unitPrice) * item.quantity);
    }, 0);

    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount + shippingCost;

    return {
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        totalAmount: totalAmount.toFixed(2)
    };
};

/**
 * Why each cart line cannot be ordered right now, if any: the product is off
 * sale, or there is not enough stock. Lines with a variant use the variant's
 * stock; others use the product's inventory.
 */
const findStockProblems = (items) => {
    const problems = [];
    for (const item of items) {
        const product = item.product;
        if (product.status !== 'active') {
            problems.push(`${product.name} is no longer available`);
            continue;
        }

        const availableStock = item.variant
            ? item.variant.stockQuantity
            : product.inventory?.availableStock || 0;

        if (availableStock < item.quantity) {
            problems.push(`${product.name}: Only ${availableStock} in stock`);
        }
    }
    return problems;
};

const stockError = (problems) =>
    createError('Cart validation failed', 400, { code: 'INSUFFICIENT_STOCK', details: problems });

/**
 * Checks the cart can be ordered. It does not hold stock: placeOrder checks
 * again and deducts stock in its own transaction, so an abandoned checkout
 * never leaves stock reserved.
 */
const initiateCheckout = async (userId) => {
    const cart = await Cart.findOne({
        where: { userId },
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        as: 'product',
                        include: [
                            { model: Inventory, as: 'inventory' },
                            { model: User, as: 'vendor' }
                        ]
                    },
                    { model: ProductVariant, as: 'variant' }
                ]
            }
        ]
    });

    if (!cart || cart.items.length === 0) throw createError('Cart is empty', 400);

    const problems = findStockProblems(cart.items);
    if (problems.length > 0) throw stockError(problems);

    return { cartId: cart.id, itemCount: cart.items.length };
};

// Each seller ships their own order, so each order carries its own delivery fee.
const SHIPPING_COST_PER_ORDER = 10.00;

const unitPriceOf = (item) => item.variant?.price || item.product.price;

/** Cart lines grouped by seller: one order per group. */
const groupByVendor = (items) => {
    const groups = new Map();
    for (const item of items) {
        const vendorId = item.product.vendorId;
        if (!groups.has(vendorId)) groups.set(vendorId, []);
        groups.get(vendorId).push(item);
    }
    return [...groups.values()];
};

const totalsOf = (items) =>
    calculateOrderTotals(
        items.map(item => ({ unitPrice: unitPriceOf(item), quantity: item.quantity })),
        SHIPPING_COST_PER_ORDER
    );

/** Adds per-order totals so the summary matches the orders exactly, to the cent. */
const sumTotals = (allTotals) => {
    const sum = (key) => allTotals.reduce((total, totals) => total + parseFloat(totals[key]), 0).toFixed(2);
    return {
        subtotal: sum('subtotal'),
        taxAmount: sum('taxAmount'),
        shippingCost: sum('shippingCost'),
        totalAmount: sum('totalAmount')
    };
};

const getCheckoutSummary = async (userId, shippingAddressId) => {
    const cart = await Cart.findOne({
        where: { userId },
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [
                    { model: Product, as: 'product' },
                    { model: ProductVariant, as: 'variant' }
                ]
            }
        ]
    });

    if (!cart || cart.items.length === 0) throw createError('Cart is empty', 400);

    const addresses = await Address.findAll({
        where: { userId },
        order: [['isDefault', 'DESC']]
    });

    const items = cart.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        variantName: item.variant?.name,
        quantity: item.quantity,
        unitPrice: unitPriceOf(item)
    }));

    const groups = groupByVendor(cart.items);

    return {
        items,
        addresses,
        selectedShippingAddress: shippingAddressId || addresses[0]?.id,
        // How many orders (and deliveries) this cart becomes.
        sellerCount: groups.length,
        ...sumTotals(groups.map(totalsOf))
    };
};

/**
 * Places the cart as one order per seller, all in one transaction: stock is
 * checked again and deducted, and nothing changes if any part fails.
 * Splitting by seller lets each seller accept, ship and deliver their own
 * order, with its own status and tracking.
 */
const placeOrder = async (userId, { shippingAddressId, billingAddressId, paymentMethod = 'cash_on_delivery', notes }) => {
    if (!shippingAddressId) throw createError('Shipping address required', 400);

    const transaction = await sequelize.transaction();

    try {
        const shippingAddress = await Address.findOne({ where: { id: shippingAddressId, userId } });
        if (!shippingAddress) {
            await transaction.rollback();
            throw createError('Shipping address not found', 404);
        }

        const cart = await Cart.findOne({
            where: { userId },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            include: [{ model: Inventory, as: 'inventory' }, { model: User, as: 'vendor' }]
                        },
                        { model: ProductVariant, as: 'variant' }
                    ]
                }
            ]
        });

        if (!cart || cart.items.length === 0) {
            await transaction.rollback();
            throw createError('Cart is empty', 400);
        }

        const problems = findStockProblems(cart.items);
        if (problems.length > 0) {
            await transaction.rollback();
            throw stockError(problems);
        }

        const orders = [];

        for (const items of groupByVendor(cart.items)) {
            const vendorId = items[0].product.vendorId;
            const totals = totalsOf(items);

            const order = await Order.create({
                orderNumber: await Order.generateOrderNumber(transaction),
                userId,
                status: 'pending',
                paymentStatus: 'pending',
                shippingAddressId,
                billingAddressId: billingAddressId || shippingAddressId,
                subtotal: totals.subtotal,
                taxAmount: totals.taxAmount,
                shippingCost: totals.shippingCost,
                discountAmount: 0,
                totalAmount: totals.totalAmount,
                paymentMethod,
                notes
            }, { transaction });

            for (const item of items) {
                const product = item.product;
                const variant = item.variant;

                await OrderItem.create({
                    orderId: order.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    vendorId,
                    productName: product.name,
                    variantName: variant?.name,
                    sku: variant?.sku || product.sku,
                    quantity: item.quantity,
                    unitPrice: unitPriceOf(item),
                    subtotal: unitPriceOf(item) * item.quantity
                }, { transaction });

                const inventory = product.inventory;
                if (inventory) {
                    await inventory.update({
                        availableStock: inventory.availableStock - item.quantity,
                        totalStock: inventory.totalStock - item.quantity,
                        lowStockAlert: (inventory.totalStock - item.quantity) <= product.lowStockThreshold
                    }, { transaction });
                }

                if (variant) {
                    await variant.decrement('stockQuantity', { by: item.quantity, transaction });
                }

                await product.increment('soldCount', { by: item.quantity, transaction });
            }

            const created = { event: EVENTS.ORDER_CREATED, feature: 'orders', data: { orderId: order.id, orderNumber: order.orderNumber } };
            await eventService.record(transaction, { ...created, level: LEVELS.STANDARD, to: { userIds: [userId] } });
            await eventService.record(transaction, { ...created, level: LEVELS.HIGH, to: { userIds: [vendorId] } });
            await eventService.record(transaction, { ...created, level: LEVELS.SILENT, to: { role: 'admin' } });

            orders.push(order);
        }

        await CartItem.destroy({ where: { cartId: cart.id }, transaction });
        await transaction.commit();

        const user = await User.findByPk(userId);
        for (const order of orders) {
            emailService.sendOrderConfirmation(user.email, user.firstName, order.orderNumber, order.totalAmount)
                .catch(err => console.error('Email send failed:', err));
        }

        const completeOrders = await Order.findAll({
            where: { id: orders.map(order => order.id) },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: User, as: 'vendor', attributes: ['id', 'firstName', 'lastName'] }]
                },
                { model: Address, as: 'shippingAddress' },
                { model: Address, as: 'billingAddress' }
            ],
            order: [['created_at', 'ASC']]
        });

        return { orders: completeOrders };
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

module.exports = {
    initiateCheckout,
    getCheckoutSummary,
    placeOrder
};
