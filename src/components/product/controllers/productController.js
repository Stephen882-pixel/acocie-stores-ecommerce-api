'use strict';

const productService = require('../services/productService');

const handleError = (res, error) => {
    console.error('[ProductController]', error.message);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
};

const getAllProducts = async (req, res) => {
    try {
        const result = await productService.getAllProducts(req.query, req.user?.role);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.id, req.user?.role);
        return res.json({ product });
    } catch (error) {
        return handleError(res, error);
    }
};

const createProduct = async (req, res) => {
    try {
        const product = await productService.createProduct(req.body, req.user.role, req.user.userId);
        return res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(
            req.params.id, req.body, req.user.role, req.user.userId
        );
        return res.json({ message: 'Product updated successfully', product });
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteProduct = async (req, res) => {
    try {
        await productService.deleteProduct(req.params.id, req.user.role, req.user.userId);
        return res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        return handleError(res, error);
    }
};

const searchProducts = async (req, res) => {
    try {
        const result = await productService.searchProducts(req.query);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getFeaturedProducts = async (req, res) => {
    try {
        const products = await productService.getFeaturedProducts(req.query.limit);
        return res.json({ products });
    } catch (error) {
        return handleError(res, error);
    }
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
