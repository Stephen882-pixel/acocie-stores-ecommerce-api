'use strict';

const productService = require('../services/productService');
const { uploadManyToS3 } = require('../../../helpers/s3.helper');

const handleError = (res, error) => {
    console.error('[ProductController]', error.message);
    console.error(error.stack);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
};


const parseJsonField = (raw, fallback = undefined) => {
    if (raw === undefined || raw === null || raw === '') return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

const parseProductFields = (body = {}) => ({
    categoryId:        body.categoryId,
    vendorId:          body.vendorId,
    name:              body.name,
    sku:               body.sku,
    price:             body.price        ? Number(body.price)        : undefined,
    comparePrice:      body.comparePrice ? Number(body.comparePrice) : undefined,
    costPrice:         body.costPrice    ? Number(body.costPrice)    : undefined,
    description:       body.description,
    shortDescription:  body.shortDescription,
    stockQuantity:     body.stockQuantity     !== undefined ? Number(body.stockQuantity)     : undefined,
    lowStockThreshold: body.lowStockThreshold !== undefined ? Number(body.lowStockThreshold) : undefined,
    weight:            body.weight ? Number(body.weight) : undefined,
    dimensions:        parseJsonField(body.dimensions),
    tags:              parseJsonField(body.tags, []),
    variants:          parseJsonField(body.variants, []),
    metaTitle:         body.metaTitle,
    metaDescription:   body.metaDescription,
    status:            body.status,
    isFeatured:        body.isFeatured === 'true' || body.isFeatured === true,
});


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

        const fields = parseProductFields(req.body || {});

        // Upload product gallery images to S3
        const imageFiles = req.files?.images || [];
        let uploadedImages = [];
        if (imageFiles.length > 0) {
            uploadedImages = await uploadManyToS3(imageFiles, 'products');
        }

        // Upload per-variant images to S3 (if provided)
        const variantImageFiles = req.files?.variantImages || [];
        let uploadedVariantImages = [];
        if (variantImageFiles.length > 0) {
            uploadedVariantImages = await uploadManyToS3(variantImageFiles, 'products/variants');
        }

        const product = await productService.createProduct(
            fields,
            uploadedImages,
            uploadedVariantImages,
            req.user.role,
            req.user.userId
        );

        return res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateProduct = async (req, res) => {
    try {
        const fields = parseProductFields(req.body || {});

        // Upload any new product images to S3
        const imageFiles = req.files?.images || [];
        let uploadedImages = [];
        if (imageFiles.length > 0) {
            uploadedImages = await uploadManyToS3(imageFiles, 'products');
        }

        const variantImageFiles = req.files?.variantImages || [];
        let uploadedVariantImages = [];
        if (variantImageFiles.length > 0) {
            uploadedVariantImages = await uploadManyToS3(variantImageFiles, 'products/variants');
        }

        const product = await productService.updateProduct(
            req.params.id,
            fields,
            uploadedImages,
            uploadedVariantImages,
            req.user.role,
            req.user.userId
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
