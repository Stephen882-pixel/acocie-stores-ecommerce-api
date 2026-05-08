
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { authorize, isVendorOrAdmin } = require('../../auth/middleware/roleMiddleware');
const validate = require('../../../middleware/validate');
const productSchema = require('../schemas/product.schema');

router.get('/',        validate(productSchema.getAllProductsQuery, 'query'),  productController.getAllProducts);
router.get('/search',  validate(productSchema.searchProductsQuery, 'query'), productController.searchProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id',     productController.getProductById);

router.post('/',   authenticate, isVendorOrAdmin, validate(productSchema.createProduct), productController.createProduct);
router.put('/:id', authenticate, isVendorOrAdmin, validate(productSchema.updateProduct), productController.updateProduct);
router.delete('/:id', authenticate, isVendorOrAdmin, productController.deleteProduct);

module.exports = router;
