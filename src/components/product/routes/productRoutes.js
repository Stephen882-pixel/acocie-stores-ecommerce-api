
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { authorize, isVendorOrAdmin } = require('../../auth/middleware/roleMiddleware');
const { uploadProductImages, handleMulterError } = require('../../../helpers/multer.helper');

router.get('/',        productController.getAllProducts);
router.get('/search',  productController.searchProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id',     productController.getProductById);

// multipart/form-data – validation happens inside the controller after JSON fields are parsed
router.post('/',
    authenticate,
    isVendorOrAdmin,
    uploadProductImages,
    handleMulterError,
    productController.createProduct
);

router.put('/:id',
    authenticate,
    isVendorOrAdmin,
    uploadProductImages,
    handleMulterError,
    productController.updateProduct
);

router.delete('/:id', authenticate, isVendorOrAdmin, productController.deleteProduct);

module.exports = router;
