/**
 * Category Schemas (DTOs)
 */

const Joi = require('joi');

// ─── Query schemas ────────────────────────────────────────────────────────────

/**
 * GET /categories  (query params)
 */
const getAllCategoriesQuery = Joi.object({
    includeInactive: Joi.string().valid('true', 'false').optional().label('Include inactive'),
    nested:          Joi.string().valid('true', 'false').optional().label('Nested')
});

/**
 * GET /categories/:id  (query params)
 */
const getCategoryQuery = Joi.object({
    includeProducts: Joi.string().valid('true', 'false').optional().label('Include products')
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

const categoryBase = {
    description:     Joi.string().trim().max(1000).optional().allow('').label('Description'),
    parentId:        Joi.string().uuid().optional().allow(null).label('Parent ID'),
    imageUrl:        Joi.string().uri().optional().allow(null, '').label('Image URL'),
    isActive:        Joi.boolean().optional().label('Is active'),
    displayOrder:    Joi.number().integer().min(0).optional().default(0).label('Display order'),
    metaTitle:       Joi.string().trim().max(160).optional().allow(null, '').label('Meta title'),
    metaDescription: Joi.string().trim().max(320).optional().allow(null, '').label('Meta description')
};

/**
 * POST /categories
 */
const createCategory = Joi.object({
    name: Joi.string().trim().min(2).max(100).required().label('Name'),
    ...categoryBase
});

/**
 * PUT /categories/:id
 */
const updateCategory = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional().label('Name'),
    ...categoryBase
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

module.exports = { getAllCategoriesQuery, getCategoryQuery, createCategory, updateCategory };
