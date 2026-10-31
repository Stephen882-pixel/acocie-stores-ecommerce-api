const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const authenticate = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { PERMISSIONS: P } = require('../constants/permissions');
const validate = require('../../../middleware/validate');
const rbacSchema = require('../schemas/rbac.schema');

router.use(authenticate);

router.get('/me/permissions', rbacController.getMyPermissions);

router.get('/permissions', requirePermission(P.ROLE_READ), rbacController.listPermissions);
router.get('/roles',       requirePermission(P.ROLE_READ), rbacController.listRoles);
router.get('/roles/:id',   requirePermission(P.ROLE_READ), rbacController.getRole);
router.put('/roles/:id/permissions', requirePermission(P.ROLE_MANAGE), validate(rbacSchema.setRolePermissions), rbacController.setRolePermissions);

router.get('/users/:userId/role', requirePermission(P.USER_READ_ANY),    rbacController.getUserRole);
router.put('/users/:userId/role', requirePermission(P.USER_ROLE_ASSIGN), validate(rbacSchema.changeUserRole), rbacController.changeUserRole);

router.get('/audit-logs', requirePermission(P.ROLE_MANAGE), validate(rbacSchema.getAuditLogsQuery, 'query'), rbacController.listAuditLogs);

module.exports = router;
