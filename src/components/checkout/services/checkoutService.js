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

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

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

    const validationErrors = [];
    for (const item of cart.items) {
        const product = item.product;
        const variant = item.variant;

        if (product.status !== 'active') {
            validationErrors.push(`${product.name} is no longer available`);
            continue;
        }

        const availableStock = variant
            ? variant.stockQuantity
            : product.inventory?.availableStock || 0;

        if (availableStock < item.quantity) {
            validationErrors.push(`${product.name}: Only ${availableStock} in stock`);
        }
    }

    if (validationErrors.length > 0) {
        const err = createError('Cart validation failed', 400);
        err.details = validationErrors;
        throw err;
    }

    for (const item of cart.items) {
        const inventory = item.product.inventory;
        if (inventory) {
            await inventory.update({
                availableStock: inventory.availableStock - item.quantity,
                reservedStock: inventory.reservedStock + item.quantity
            });
        }
    }

    return { cartId: cart.id, itemCount: cart.items.length };
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

    const orderItems = cart.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        variantName: item.variant?.name,
        quantity: item.quantity,
        unitPrice: item.variant?.price || item.product.price
    }));

    const shippingCost = 10.00;
    const totals = calculateOrderTotals(orderItems, shippingCost);

    return {
        items: orderItems,
        addresses,
        selectedShippingAddress: shippingAddressId || addresses[0]?.id,
        ...totals
    };
};

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

        const orderNumber = await Order.generateOrderNumber();
        const shippingCost = 10.00;

        const orderItems = cart.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.variant?.price || item.product.price
        }));
        const totals = calculateOrderTotals(orderItems, shippingCost);

        const order = await Order.create({
            orderNumber,
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

        for (const item of cart.items) {
            const product = item.product;
            const variant = item.variant;

            await OrderItem.create({
                orderId: order.id,
                productId: item.productId,
                variantId: item.variantId,
                vendorId: product.vendorId,
                productName: product.name,
                variantName: variant?.name,
                sku: variant?.sku || product.sku,
                quantity: item.quantity,
                unitPrice: variant?.price || product.price,
                subtotal: (variant?.price || product.price) * item.quantity
            }, { transaction });

            const inventory = product.inventory;
            if (inventory) {
                await inventory.update({
                    reservedStock: inventory.reservedStock - item.quantity,
                    totalStock: inventory.totalStock - item.quantity,
                    lowStockAlert: (inventory.totalStock - item.quantity) <= product.lowStockThreshold
                }, { transaction });
            }

            await product.increment('soldCount', { by: item.quantity, transaction });
        }

        await CartItem.destroy({ where: { cartId: cart.id }, transaction });
        await transaction.commit();

        const user = await User.findByPk(userId);
        emailService.sendOrderConfirmation(user.email, user.firstName, order.orderNumber, totals.totalAmount)
            .catch(err => console.error('Email send failed:', err));

        const completeOrder = await Order.findByPk(order.id, {
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: User, as: 'vendor', attributes: ['id', 'firstName', 'lastName'] }]
                },
                { model: Address, as: 'shippingAddress' },
                { model: Address, as: 'billingAddress' }
            ]
        });

        return completeOrder;
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
