
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../rbac/middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const validate = require('../../../middleware/validate');
const categorySchema = require('../schemas/category.schema');

router.get('/',    validate(categorySchema.getAllCategoriesQuery, 'query'), categoryController.getAllCategories);
router.get('/:id', validate(categorySchema.getCategoryQuery, 'query'),     categoryController.getCategoryById);

router.post('/',   authenticate, requirePermission(P.CATEGORY_CREATE), validate(categorySchema.createCategory), categoryController.createCategory);
router.put('/:id', authenticate, requirePermission(P.CATEGORY_UPDATE), validate(categorySchema.updateCategory), categoryController.updateCategory);
router.delete('/:id', authenticate, requirePermission(P.CATEGORY_DELETE), categoryController.deleteCategory);

module.exports = router;


