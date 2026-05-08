/**
 * Product Schemas (DTOs)
 */

const Joi = require('joi');

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const imageSchema = Joi.object({
    url:     Joi.string().uri().required().label('Image URL'),
    altText: Joi.string().trim().max(255).optional().allow('').label('Alt text')
});

const variantSchema = Joi.object({
    sku:           Joi.string().trim().max(100).required().label('Variant SKU'),
    name:          Joi.string().trim().max(255).required().label('Variant name'),
    options:       Joi.object().optional().label('Variant options'),
    price:         Joi.number().positive().precision(2).required().label('Variant price'),
    comparePrice:  Joi.number().positive().precision(2).optional().allow(null).label('Compare price'),
    stockQuantity: Joi.number().integer().min(0).default(0).label('Stock quantity'),
    imageUrl:      Joi.string().uri().optional().allow(null, '').label('Variant image URL'),
    isActive:      Joi.boolean().default(true).label('Is active')
});

// ─── Query schemas ────────────────────────────────────────────────────────────

/**
 * GET /products  (query params)
 */
const getAllProductsQuery = Joi.object({
    page:     Joi.number().integer().min(1).default(1).label('Page'),
    limit:    Joi.number().integer().min(1).max(100).default(20).label('Limit'),
    category: Joi.string().uuid().optional().label('Category ID'),
    minPrice: Joi.number().positive().optional().label('Min price'),
    maxPrice: Joi.number().positive().optional().label('Max price'),
    status:   Joi.string().valid('active', 'draft', 'archived').optional().label('Status'),
    featured: Joi.string().valid('true', 'false').optional().label('Featured'),
    vendor:   Joi.string().uuid().optional().label('Vendor ID'),
    sortBy:   Joi.string().valid('created_at', 'price', 'name', 'viewCount', 'soldCount').optional().label('Sort by'),
    order:    Joi.string().valid('ASC', 'DESC').optional().label('Order')
});

/**
 * GET /products/search  (query params)
 */
const searchProductsQuery = Joi.object({
    q:     Joi.string().trim().min(1).max(200).required().label('Search query'),
    page:  Joi.number().integer().min(1).default(1).label('Page'),
    limit: Joi.number().integer().min(1).max(100).default(20).label('Limit')
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

const productBase = {
    description:       Joi.string().trim().max(5000).optional().allow(null, '').label('Description'),
    shortDescription:  Joi.string().trim().max(500).optional().allow(null, '').label('Short description'),
    comparePrice:      Joi.number().positive().precision(2).optional().allow(null).label('Compare price'),
    costPrice:         Joi.number().positive().precision(2).optional().allow(null).label('Cost price'),
    stockQuantity:     Joi.number().integer().min(0).default(0).label('Stock quantity'),
    lowStockThreshold: Joi.number().integer().min(0).default(5).label('Low stock threshold'),
    weight:            Joi.number().positive().optional().allow(null).label('Weight'),
    dimensions:        Joi.object({
                           length: Joi.number().positive().optional(),
                           width:  Joi.number().positive().optional(),
                           height: Joi.number().positive().optional()
                       }).optional().allow(null).label('Dimensions'),
    tags:              Joi.array().items(Joi.string().trim().lowercase()).optional().default([]).label('Tags'),
    metaTitle:         Joi.string().trim().max(160).optional().allow(null, '').label('Meta title'),
    metaDescription:   Joi.string().trim().max(320).optional().allow(null, '').label('Meta description'),
    status:            Joi.string().valid('draft', 'active', 'archived').optional().default('draft').label('Status'),
    isFeatured:        Joi.boolean().optional().default(false).label('Is featured'),
    images:            Joi.array().items(imageSchema).optional().label('Images'),
    variants:          Joi.array().items(variantSchema).optional().label('Variants')
};

/**
 * POST /products
 */
const createProduct = Joi.object({
    categoryId: Joi.string().uuid().required().label('Category ID'),
    name:       Joi.string().trim().min(2).max(255).required().label('Name'),
    sku:        Joi.string().trim().min(2).max(100).required().label('SKU'),
    price:      Joi.number().positive().precision(2).required().label('Price'),
    vendorId:   Joi.string().uuid().optional().label('Vendor ID'),
    ...productBase
});

/**
 * PUT /products/:id
 */
const updateProduct = Joi.object({
    categoryId: Joi.string().uuid().optional().label('Category ID'),
    name:       Joi.string().trim().min(2).max(255).optional().label('Name'),
    sku:        Joi.string().trim().min(2).max(100).optional().label('SKU'),
    price:      Joi.number().positive().precision(2).optional().label('Price'),
    vendorId:   Joi.string().uuid().optional().label('Vendor ID'),
    ...productBase
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

module.exports = { getAllProductsQuery, searchProductsQuery, createProduct, updateProduct };
