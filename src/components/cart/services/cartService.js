'use strict';

const {
    Cart,
    CartItem,
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    User
} = require('../../../models');
const { v4: uuidv4 } = require('uuid');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getOrCreateCart = async (userId, sessionId) => {
    let cart;

    if (userId) {
        cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            cart = await Cart.create({ userId });
        }
    } else if (sessionId) {
        cart = await Cart.findOne({ where: { sessionId } });
        if (!cart) {
            const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            cart = await Cart.create({ sessionId, expires_at });
        }
    }

    return cart;
};

const calculateCartTotals = (items) => {
    const subtotal = items.reduce((sum, item) => {
        const price = item.variant?.price || item.product.price;
        return sum + (parseFloat(price) * item.quantity);
    }, 0);

    return {
        subtotal: subtotal.toFixed(2),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
};

const getCart = async (userId, sessionId) => {
    if (!userId && !sessionId) {
        throw createError('User authentication or session ID required', 400);
    }

    const cart = await getOrCreateCart(userId, sessionId);

    const items = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [
            {
                model: Product,
                as: 'product',
                include: [
                    {
                        model: ProductImage,
                        as: 'images',
                        where: { isPrimary: true },
                        required: false,
                        limit: 1
                    },
                    { model: Inventory, as: 'inventory' },
                    {
                        model: User,
                        as: 'vendor',
                        attributes: ['id', 'firstName', 'lastName']
                    }
                ]
            },
            { model: ProductVariant, as: 'variant', required: false }
        ],
        order: [['created_at', 'ASC']]
    });

    const itemsWithIssues = items.map(item => {
        const product = item.product;
        const variant = item.variant;
        const currentPrice = variant?.price || product.price;
        const priceChanged = parseFloat(currentPrice) !== parseFloat(item.priceAtAddition);

        let availableStock;
        if (variant) {
            availableStock = variant.stockQuantity;
        } else {
            availableStock = product.Inventory?.availableStock || 0;
        }

        const issues = [];
        if (product.status !== 'active') issues.push('product no longer available');
        if (availableStock < item.quantity) issues.push('Insufficient stock');
        if (priceChanged) issues.push(`Price changed from ${item.priceAtAddition} to ${currentPrice}`);

        return { ...item.toJSON(), currentPrice, availableStock, priceChanged, issues };
    });

    const totals = calculateCartTotals(items);

    return { id: cart.id, items: itemsWithIssues, ...totals };
};

const addToCart = async ({ productId, variantId, quantity = 1 }, userId, sessionId) => {
    if (!productId) throw createError('Product ID is required', 400);
    if (quantity < 1) throw createError('Quantity must be at least 1', 400);

    const resolvedSessionId = sessionId || uuidv4();
    const cart = await getOrCreateCart(userId, resolvedSessionId);

    const product = await Product.findOne({
        where: { id: productId, status: 'active' },
        include: [{ model: Inventory, as: 'inventory' }]
    });

    if (!product) throw createError('Product not found or unavailable', 404);

    let variant = null;
    if (variantId) {
        variant = await ProductVariant.findOne({
            where: { id: variantId, productId, isActive: true }
        });
        if (!variant) throw createError('Product variant not found', 404);
    }

    const availableStock = variant
        ? variant.stockQuantity
        : product.inventory?.availableStock || 0;

    if (availableStock < quantity) {
        const err = createError('Insufficient stock', 400);
        err.availableStock = availableStock;
        throw err;
    }

    const currentPrice = variant?.price || product.price;

    const existingItem = await CartItem.findOne({
        where: { cartId: cart.id, productId, variantId: variantId || null }
    });

    let cartItem;

    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (availableStock < newQuantity) {
            const err = createError('Insufficient stock for requested quantity', 400);
            err.availableStock = availableStock;
            throw err;
        }
        await existingItem.update({ quantity: newQuantity, priceAtAddition: currentPrice });
        cartItem = existingItem;
    } else {
        cartItem = await CartItem.create({
            cartId: cart.id,
            productId,
            variantId,
            quantity,
            priceAtAddition: currentPrice
        });
    }

    const completeItem = await CartItem.findByPk(cartItem.id, {
        include: [
            {
                model: Product,
                as: 'product',
                include: [
                    {
                        model: ProductImage,
                        as: 'images',
                        where: { isPrimary: true },
                        required: false,
                        limit: 1
                    }
                ]
            },
            { model: ProductVariant, as: 'variant' }
        ]
    });

    return { cartItem: completeItem, sessionId: !userId ? resolvedSessionId : undefined };
};

const updateCartItem = async (itemId, quantity, userId, sessionId) => {
    if (!quantity || quantity < 1) throw createError('Valid quantity required', 400);

    const cart = await getOrCreateCart(userId, sessionId);

    const cartItem = await CartItem.findOne({
        where: { id: itemId, cartId: cart.id },
        include: [
            { model: Product, as: 'product', include: [{ model: Inventory, as: 'inventory' }] },
            { model: ProductVariant, as: 'variant' }
        ]
    });

    if (!cartItem) throw createError('Cart item not found', 404);

    const availableStock = cartItem.variant
        ? cartItem.variant.stockQuantity
        : cartItem.product.inventory?.availableStock || 0;

    if (availableStock < quantity) {
        const err = createError('Insufficient stock', 400);
        err.availableStock = availableStock;
        throw err;
    }

    await cartItem.update({ quantity });
    return cartItem;
};

const removeCartItem = async (itemId, userId, sessionId) => {
    const cart = await getOrCreateCart(userId, sessionId);

    const cartItem = await CartItem.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!cartItem) throw createError('Cart item not found', 404);

    await cartItem.destroy();
};

const clearCart = async (userId, sessionId) => {
    const cart = await getOrCreateCart(userId, sessionId);
    await CartItem.destroy({ where: { cartId: cart.id } });
};

const validateCart = async (userId, sessionId) => {
    const cart = await getOrCreateCart(userId, sessionId);

    const items = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [
            { model: Product, as: 'product', include: [{ model: Inventory, as: 'inventory' }] },
            { model: ProductVariant, as: 'variant' }
        ]
    });

    const validation = { isValid: true, issues: [], invalidItems: [] };

    for (const item of items) {
        const product = item.product;
        const variant = item.variant;
        const itemIssues = [];

        if (product.status !== 'active') {
            itemIssues.push('Product no longer available');
            validation.isValid = false;
        }

        const currentPrice = variant?.price || product.price;
        if (parseFloat(currentPrice) !== parseFloat(item.priceAtAddition)) {
            itemIssues.push(`Price changed from ${item.priceAtAddition} to ${currentPrice}`);
        }

        if (itemIssues.length > 0) {
            validation.invalidItems.push({
                itemId: item.id,
                productName: product.name,
                issues: itemIssues
            });
            validation.issues.push(...itemIssues);
        }
    }

    return validation;
};

const mergeCarts = async (userId, guestSessionId) => {
    if (!guestSessionId) throw createError('Guest session ID required', 400);

    const guestCart = await Cart.findOne({
        where: { sessionId: guestSessionId },
        include: [{ model: CartItem, as: 'items' }]
    });

    if (!guestCart || guestCart.items.length === 0) {
        return { merged: false };
    }

    let userCart = await Cart.findOne({ where: { userId } });
    if (!userCart) {
        userCart = await Cart.create({ userId });
    }

    for (const guestItem of guestCart.items) {
        const existingItem = await CartItem.findOne({
            where: {
                cartId: userCart.id,
                productId: guestItem.productId,
                variantId: guestItem.variantId || null
            }
        });

        if (existingItem) {
            await existingItem.update({ quantity: existingItem.quantity + guestItem.quantity });
        } else {
            await guestItem.update({ cartId: userCart.id });
        }
    }

    await guestCart.destroy();
    return { merged: true };
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    validateCart,
    mergeCarts
};
