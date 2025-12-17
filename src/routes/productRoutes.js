
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../middleware/authMiddleware');
const { authorize, isVendorOrAdmin } = require('../middleware/roleMiddleware');

router.get('/',productController.getAllProducts);
router.get('/:id',productController.getProductById);
router.get('/search',productController.searchProducts);
router.get('/featured',productController.getFeaturedProducts);

router.post('/:id',authenticate,isVendorOrAdmin,productController.createProduct);
router.delete('/:id',authenticate,isVendorOrAdmin,productController.deleteProduct);

module.exports = router;
