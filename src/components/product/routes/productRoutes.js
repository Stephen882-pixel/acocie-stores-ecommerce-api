
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../rbac/middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const { uploadProductImages, handleMulterError } = require('../../../helpers/multer.helper');

router.get('/',        productController.getAllProducts);
router.get('/search',  productController.searchProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id',     productController.getProductById);

// multipart/form-data – validation happens inside the controller after JSON fields are parsed
router.post('/',
    authenticate,
    requirePermission(P.PRODUCT_CREATE),
    uploadProductImages,
    handleMulterError,
    productController.createProduct
);

router.put('/:id',
    authenticate,
    requirePermission(P.PRODUCT_UPDATE_OWN, P.PRODUCT_UPDATE_ANY),
    uploadProductImages,
    handleMulterError,
    productController.updateProduct
);

router.delete('/:id', authenticate, requirePermission(P.PRODUCT_DELETE_OWN, P.PRODUCT_DELETE_ANY), productController.deleteProduct);

module.exports = router;
