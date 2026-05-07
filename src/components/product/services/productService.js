'use strict';

const { sequelize, Product, Category, ProductImage, ProductVariant, Inventory, User } = require('../../../models');
const { Op } = require('sequelize');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const generateSlug = (text) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const getAllProducts = async ({
    page = 1, limit = 20, category, minPrice, maxPrice,
    status = 'active', featured, vendor, sortBy = 'created_at', order = 'DESC'
}, userRole) => {
    const offset = (page - 1) * limit;
    const where = {};

    if (userRole === 'admin' || userRole === 'super_admin') {
        if (status) where.status = status;
    } else {
        where.status = 'active';
    }

    if (category) where.categoryId = category;
    if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = minPrice;
        if (maxPrice) where.price[Op.lte] = maxPrice;
    }
    if (featured === 'true') where.isFeatured = true;
    if (vendor) where.vendorId = vendor;

    const { count, rows: products } = await Product.findAndCountAll({
        where,
        include: [
            { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
            {
                model: ProductImage,
                as: 'images',
                where: { isPrimary: true },
                required: false,
                limit: 1
            },
            { model: User, as: 'vendor', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, order]],
        distinct: true
    });

    return {
        products,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
        }
    };
};

const getProductById = async (id, userRole) => {
    const product = await Product.findOne({
        where: {
            id,
            ...(userRole === 'admin' || userRole === 'super_admin' ? {} : { status: 'active' })
        },
        include: [
            { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
            { model: ProductImage, as: 'images', order: [['displayOrder', 'ASC']] },
            { model: ProductVariant, as: 'variants', where: { isActive: true }, required: false },
            { model: Inventory, as: 'inventory' },
            { model: User, as: 'vendor', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
        ]
    });

    if (!product) throw createError('Product not found', 404);

    await product.increment('viewCount');
    return product;
};

const createProduct = async (body, userRole, requestingUserId) => {
    const {
        categoryId, name, description, shortDescription, sku, price, comparePrice, costPrice,
        stockQuantity, lowStockThreshold, weight, dimensions, tags, metaTitle, metaDescription,
        status, isFeatured, images, variants
    } = body;

    if (!categoryId || !name || !sku || !price) {
        throw createError('Missing required fields: categoryId, name, sku, price', 400);
    }

    const category = await Category.findByPk(categoryId);
    if (!category) throw createError('Category not found', 404);

    const existingSku = await Product.findOne({ where: { sku } });
    if (existingSku) throw createError('SKU already exists', 409);

    const slug = generateSlug(name);
    let finalSlug = slug;
    let counter = 1;
    while (await Product.findOne({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${counter}`;
        counter++;
    }

    const vendorId = userRole === 'vendor' ? requestingUserId : (body.vendorId || requestingUserId);

    const product = await Product.create({
        vendorId,
        categoryId,
        name,
        slug: finalSlug,
        description,
        shortDescription,
        sku,
        price,
        comparePrice,
        costPrice,
        stockQuantity: stockQuantity || 0,
        lowStockThreshold: lowStockThreshold || 5,
        weight,
        dimensions,
        tags: tags || [],
        metaTitle,
        metaDescription,
        status: status || 'draft',
        isFeatured: isFeatured || false
    });

    await Inventory.create({
        productId: product.id,
        totalStock: stockQuantity || 0,
        availableStock: stockQuantity || 0,
        reservedStock: 0,
        lowStockAlert: (stockQuantity || 0) <= (lowStockThreshold || 5)
    });

    if (images && Array.isArray(images)) {
        for (let i = 0; i < images.length; i++) {
            await ProductImage.create({
                productId: product.id,
                imageUrl: images[i].url,
                altText: images[i].altText || name,
                isPrimary: i === 0,
                displayOrder: i
            });
        }
    }

    if (variants && Array.isArray(variants)) {
        for (const variant of variants) {
            await ProductVariant.create({
                productId: product.id,
                sku: variant.sku,
                name: variant.name,
                options: variant.options,
                price: variant.price,
                comparePrice: variant.comparePrice,
                stockQuantity: variant.stockQuantity || 0,
                imageUrl: variant.imageUrl,
                isActive: variant.isActive !== false
            });
        }
    }

    const completeProduct = await Product.findByPk(product.id, {
        include: [
            { model: Category, as: 'category' },
            { model: ProductImage, as: 'images' },
            { model: ProductVariant, as: 'variants' },
            { model: Inventory, as: 'inventory' }
        ]
    });

    return completeProduct;
};

const updateProduct = async (id, updates, userRole, requestingUserId) => {
    const product = await Product.findByPk(id);
    if (!product) throw createError('Product not found', 404);

    if (userRole === 'vendor' && product.vendorId !== requestingUserId) {
        throw createError('You can only update your own products', 403);
    }

    if (updates.name && updates.name !== product.name) {
        updates.slug = generateSlug(updates.name);
    }

    await product.update(updates);

    if (updates.stockQuantity !== undefined) {
        await Inventory.update(
            {
                totalStock: updates.stockQuantity,
                availableStock: updates.stockQuantity,
                lowStockAlert: updates.stockQuantity <= (product.lowStockThreshold || 5)
            },
            { where: { productId: id } }
        );
    }

    const updatedProduct = await Product.findByPk(id, {
        include: [
            { model: Category, as: 'category' },
            { model: ProductImage, as: 'images' },
            { model: ProductVariant, as: 'variants' },
            { model: Inventory, as: 'inventory' }
        ]
    });

    return updatedProduct;
};

const deleteProduct = async (id, userRole, requestingUserId) => {
    const product = await Product.findByPk(id);
    if (!product) throw createError('Product not found', 404);

    if (userRole === 'vendor' && product.vendorId !== requestingUserId) {
        throw createError('You can only delete your own products', 403);
    }

    await sequelize.transaction(async (t) => {
        await ProductImage.destroy({ where: { productId: id }, transaction: t });
        await ProductVariant.destroy({ where: { productId: id }, transaction: t });
        await Inventory.destroy({ where: { productId: id }, transaction: t });
        await product.destroy({ transaction: t });
    });
};

const searchProducts = async ({ q, page = 1, limit = 20 }) => {
    if (!q) throw createError('Search query required', 400);

    const offset = (page - 1) * limit;

    const { count, rows: products } = await Product.findAndCountAll({
        where: {
            status: 'active',
            [Op.or]: [
                { name: { [Op.iLike]: `%${q}%` } },
                { description: { [Op.iLike]: `%${q}%` } },
                { tags: { [Op.contains]: [q.toLowerCase()] } }
            ]
        },
        include: [
            { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
            {
                model: ProductImage,
                as: 'images',
                where: { isPrimary: true },
                required: false,
                limit: 1
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['viewCount', 'DESC'], ['created_at', 'DESC']]
    });

    return {
        query: q,
        products,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
        }
    };
};

const getFeaturedProducts = async (limit = 10) => {
    const products = await Product.findAll({
        where: { status: 'active', isFeatured: true },
        include: [
            { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
            {
                model: ProductImage,
                as: 'images',
                where: { isPrimary: true },
                required: false,
                limit: 1
            }
        ],
        limit: parseInt(limit),
        order: [['soldCount', 'DESC'], ['viewCount', 'DESC']]
    });

    return products;
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getFeaturedProducts
};
