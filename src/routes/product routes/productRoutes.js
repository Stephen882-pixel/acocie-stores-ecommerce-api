
const express = require('express');
const router = express.Router();
const productController = require('../../controllers/product controllers/productController');
const authenticate = require('../../middleware/authMiddleware');
const { authorize, isVendorOrAdmin } = require('../../middleware/roleMiddleware');

router.get('/',productController.getAllProducts);
router.get('/search',productController.searchProducts);
router.get('/featured',productController.getFeaturedProducts);
router.get('/:id',productController.getProductById);

router.post('/',authenticate,isVendorOrAdmin,productController.createProduct);
router.put('/:id',authenticate,isVendorOrAdmin,productController.updateProduct);
router.delete('/:id',authenticate,isVendorOrAdmin,productController.deleteProduct);

module.exports = router;
