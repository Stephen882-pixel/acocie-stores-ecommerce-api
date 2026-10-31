'use strict';

const productService = require('../services/productService');
const { uploadManyToS3 } = require('../../../helpers/s3.helper');
const { sendSuccess } = require('../../../helpers/response.helper');


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

// Uploads the gallery and per-variant images in req.files to S3.
const uploadProductFiles = async (files = {}) => ({
    uploadedImages:        files.images?.length        ? await uploadManyToS3(files.images, 'products') : [],
    uploadedVariantImages: files.variantImages?.length ? await uploadManyToS3(files.variantImages, 'products/variants') : []
});

const getAllProducts = async (req, res) => {
    const { products, pagination } = await productService.getAllProducts(req.query, req.user?.role);
    return sendSuccess(res, products, { meta: { pagination } });
};

const getProductById = async (req, res) => {
    const product = await productService.getProductById(req.params.id, req.user?.role);
    return sendSuccess(res, product);
};

const createProduct = async (req, res) => {
    const fields = parseProductFields(req.body || {});
    const { uploadedImages, uploadedVariantImages } = await uploadProductFiles(req.files);

    const product = await productService.createProduct(fields, uploadedImages, uploadedVariantImages, req.user);
    return sendSuccess(res, product, { statusCode: 201, message: 'Product created successfully' });
};

const updateProduct = async (req, res) => {
    const fields = parseProductFields(req.body || {});
    const { uploadedImages, uploadedVariantImages } = await uploadProductFiles(req.files);

    const product = await productService.updateProduct(req.params.id, fields, uploadedImages, uploadedVariantImages, req.user);
    return sendSuccess(res, product, { message: 'Product updated successfully' });
};

const deleteProduct = async (req, res) => {
    await productService.deleteProduct(req.params.id, req.user);
    return sendSuccess(res, null, { message: 'Product deleted successfully' });
};

const searchProducts = async (req, res) => {
    const { query, products, pagination } = await productService.searchProducts(req.query);
    return sendSuccess(res, products, { meta: { query, pagination } });
};

const getFeaturedProducts = async (req, res) => {
    const products = await productService.getFeaturedProducts(req.query.limit);
    return sendSuccess(res, products);
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
