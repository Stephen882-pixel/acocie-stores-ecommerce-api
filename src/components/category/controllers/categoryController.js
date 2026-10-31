'use strict';

const categoryService = require('../services/categoryService');
const { sendSuccess } = require('../../../helpers/response.helper');

const getAllCategories = async (req, res) => {
    const { includeInactive, nested } = req.query;
    const categories = await categoryService.getAllCategories({
        includeInactive, nested, userRole: req.user?.role
    });
    return sendSuccess(res, categories);
};

const getCategoryById = async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id, req.query.includeProducts);
    return sendSuccess(res, category);
};

const createCategory = async (req, res) => {
    const category = await categoryService.createCategory(req.body);
    return sendSuccess(res, category, { statusCode: 201, message: 'Category created successfully' });
};

const updateCategory = async (req, res) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, category, { message: 'Category updated successfully' });
};

const deleteCategory = async (req, res) => {
    await categoryService.deleteCategory(req.params.id);
    return sendSuccess(res, null, { message: 'Category deleted successfully' });
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
