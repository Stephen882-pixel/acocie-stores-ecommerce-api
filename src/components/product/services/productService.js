'use strict';

const { sequelize, Product, Category, ProductImage, ProductVariant, Inventory, User } = require('../../../models');
const { Op } = require('sequelize');
const { deleteFromS3 } = require('../../../helpers/s3.helper');

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

/**
 * createProduct
 *
 * @param {object}  fields               - parsed form fields (from controller)
 * @param {Array}   uploadedImages        - [{ key, url }] from S3 for the product gallery
 * @param {Array}   uploadedVariantImages - [{ key, url }] from S3 for per-variant images
 * @param {string}  userRole
 * @param {string}  requestingUserId
 */
const createProduct = async (fields, uploadedImages = [], uploadedVariantImages = [], userRole, requestingUserId) => {
    const {
        categoryId, name, description, shortDescription, sku, price, comparePrice, costPrice,
        stockQuantity, lowStockThreshold, weight, dimensions, tags, metaTitle, metaDescription,
        status, isFeatured, variants
    } = fields;

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

    const vendorId = userRole === 'vendor' ? requestingUserId : (fields.vendorId || requestingUserId);

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
        status: status || 'active',
        isFeatured: isFeatured || false
    });

    await Inventory.create({
        productId: product.id,
        totalStock: stockQuantity || 0,
        availableStock: stockQuantity || 0,
        reservedStock: 0,
        lowStockAlert: (stockQuantity || 0) <= (lowStockThreshold || 5)
    });

    // Persist S3-uploaded gallery images
    for (let i = 0; i < uploadedImages.length; i++) {
        await ProductImage.create({
            productId:    product.id,
            imageUrl:     uploadedImages[i].url,
            s3Key:        uploadedImages[i].key,
            altText:      name,
            isPrimary:    i === 0,
            displayOrder: i
        });
    }

    // Persist variants – assign S3 variant images by index if provided
    if (variants && Array.isArray(variants)) {
        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            const variantImageUrl = uploadedVariantImages[i]?.url || variant.imageUrl || null;

            // options may arrive as a JSON string if the client double-encoded it
            let options = variant.options;
            if (typeof options === 'string') {
                try { options = JSON.parse(options); } catch { options = {}; }
            }
            if (!options || typeof options !== 'object') options = {};

            if (!variant.sku) throw createError(`Variant at index ${i} is missing required field: sku`, 400);
            if (!variant.name) throw createError(`Variant at index ${i} is missing required field: name`, 400);

            await ProductVariant.create({
                productId:    product.id,
                sku:          variant.sku,
                name:         variant.name,
                options,
                price:        variant.price,
                comparePrice: variant.comparePrice,
                stockQuantity: variant.stockQuantity || 0,
                imageUrl:     variantImageUrl,
                isActive:     variant.isActive !== false
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

/**
 * updateProduct
 *
 * @param {string} id
 * @param {object} fields              - parsed form fields
 * @param {Array}  uploadedImages       - new S3 images [{ key, url }] — APPENDED to existing
 * @param {Array}  uploadedVariantImages
 * @param {string} userRole
 * @param {string} requestingUserId
 */
const updateProduct = async (id, fields, uploadedImages = [], uploadedVariantImages = [], userRole, requestingUserId) => {
    const product = await Product.findByPk(id);
    if (!product) throw createError('Product not found', 404);

    if (userRole === 'vendor' && product.vendorId !== requestingUserId) {
        throw createError('You can only update your own products', 403);
    }

    const updates = { ...fields };
    delete updates.variants; // handle variants separately below

    if (updates.name && updates.name !== product.name) {
        updates.slug = generateSlug(updates.name);
    }

    // Remove undefined keys so we don't overwrite with null accidentally
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    await product.update(updates);

    if (fields.stockQuantity !== undefined) {
        await Inventory.update(
            {
                totalStock:    fields.stockQuantity,
                availableStock: fields.stockQuantity,
                lowStockAlert: fields.stockQuantity <= (product.lowStockThreshold || 5)
            },
            { where: { productId: id } }
        );
    }

    // Append new gallery images from S3
    if (uploadedImages.length > 0) {
        const existingCount = await ProductImage.count({ where: { productId: id } });
        for (let i = 0; i < uploadedImages.length; i++) {
            await ProductImage.create({
                productId:    id,
                imageUrl:     uploadedImages[i].url,
                s3Key:        uploadedImages[i].key,
                altText:      product.name,
                isPrimary:    existingCount === 0 && i === 0,
                displayOrder: existingCount + i
            });
        }
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

    const images = await ProductImage.findAll({ where: { productId: id }, attributes: ['s3Key'] });
    const s3Keys = images.map((img) => img.s3Key).filter(Boolean);

    await sequelize.transaction(async (t) => {
        await ProductImage.destroy({ where: { productId: id }, transaction: t });
        await ProductVariant.destroy({ where: { productId: id }, transaction: t });
        await Inventory.destroy({ where: { productId: id }, transaction: t });
        await product.destroy({ transaction: t });
    });

    await Promise.allSettled(s3Keys.map((key) => deleteFromS3(key)));
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
