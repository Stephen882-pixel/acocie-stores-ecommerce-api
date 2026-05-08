
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { isAdmin } = require('../../auth/middleware/roleMiddleware');
const validate = require('../../../middleware/validate');
const categorySchema = require('../schemas/category.schema');

router.get('/',    validate(categorySchema.getAllCategoriesQuery, 'query'), categoryController.getAllCategories);
router.get('/:id', validate(categorySchema.getCategoryQuery, 'query'),     categoryController.getCategoryById);

router.post('/',   authenticate, isAdmin, validate(categorySchema.createCategory), categoryController.createCategory);
router.put('/:id', authenticate, isAdmin, validate(categorySchema.updateCategory), categoryController.updateCategory);
router.delete('/:id', authenticate, isAdmin, categoryController.deleteCategory);

module.exports = router;


