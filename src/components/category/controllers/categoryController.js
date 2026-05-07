'use strict';

const categoryService = require('../services/categoryService');

const handleError = (res, error) => {
    console.error('[CategoryController]', error.message);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
};

const getAllCategories = async (req, res) => {
    try {
        const { includeInactive, nested } = req.query;
        const categories = await categoryService.getAllCategories({
            includeInactive, nested, userRole: req.user?.role
        });
        return res.json({ categories });
    } catch (error) {
        return handleError(res, error);
    }
};

const getCategoryById = async (req, res) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id, req.query.includeProducts);
        return res.json({ category });
    } catch (error) {
        return handleError(res, error);
    }
};

const createCategory = async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body);
        return res.status(201).json({ message: 'Category created successfully', category });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateCategory = async (req, res) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        return res.json({ message: 'Category updated successfully', category });
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteCategory = async (req, res) => {
    try {
        await categoryService.deleteCategory(req.params.id);
        return res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
