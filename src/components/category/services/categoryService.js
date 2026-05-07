'use strict';

const { Category, Product } = require('../../../models');

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

const getAllCategories = async ({ includeInactive, nested, userRole }) => {
    const where = {};
    if (!includeInactive || (userRole !== 'admin' && userRole !== 'super_admin')) {
        where.isActive = true;
    }

    if (nested === 'true') {
        const categories = await Category.findAll({
            where: { ...where, parentId: null },
            include: [
                {
                    model: Category,
                    as: 'children',
                    where: { isActive: true },
                    required: false
                }
            ],
            order: [['displayOrder', 'ASC'], ['name', 'ASC']]
        });
        return categories;
    }

    const categories = await Category.findAll({
        where,
        include: [
            { model: Category, as: 'parent', attributes: ['id', 'name', 'slug'] }
        ],
        order: [['displayOrder', 'ASC'], ['name', 'ASC']]
    });

    return categories;
};

const getCategoryById = async (id, includeProducts) => {
    const include = [
        { model: Category, as: 'parent', attributes: ['id', 'name', 'slug'] },
        { model: Category, as: 'children', where: { isActive: true }, required: false }
    ];

    if (includeProducts === 'true') {
        include.push({
            model: Product,
            as: 'products',
            where: { status: 'active' },
            required: false,
            limit: 20
        });
    }

    const category = await Category.findByPk(id, { include });
    if (!category) throw createError('Category not found', 404);
    return category;
};

const createCategory = async ({
    name, description, parentId, imageUrl, isActive, displayOrder, metaTitle, metaDescription
}) => {
    if (!name) throw createError('Category name is required', 400);

    const slug = generateSlug(name);
    let finalSlug = slug;
    let counter = 1;

    while (await Category.findOne({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${counter}`;
        counter++;
    }

    if (parentId) {
        const parent = await Category.findByPk(parentId);
        if (!parent) throw createError('Parent category not found', 404);
    }

    const category = await Category.create({
        name,
        slug: finalSlug,
        description,
        parentId,
        imageUrl,
        isActive: isActive !== false,
        displayOrder: displayOrder || 0,
        metaTitle,
        metaDescription
    });

    return category;
};

const updateCategory = async (id, updates) => {
    const category = await Category.findByPk(id);
    if (!category) throw createError('Category not found', 404);

    if (updates.name && updates.name !== category.name) {
        updates.slug = generateSlug(updates.name);
    }

    if (updates.parentId) {
        if (updates.parentId === id) {
            throw createError('Category cannot be its own parent', 400);
        }
        const parent = await Category.findByPk(updates.parentId);
        if (!parent) throw createError('Parent category not found', 404);
    }

    await category.update(updates);
    return category;
};

const deleteCategory = async (id) => {
    const category = await Category.findByPk(id);
    if (!category) throw createError('Category not found', 404);

    const productCount = await Product.count({ where: { categoryId: id } });
    if (productCount > 0) {
        throw createError('Cannot delete category with existing products', 400);
    }

    const childrenCount = await Category.count({ where: { parentId: id } });
    if (childrenCount > 0) {
        throw createError('Cannot delete category with subcategories', 400);
    }

    await category.destroy();
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
