/**
 * RBAC permission catalog.
 *
 * Permission keys use the format <resource>:<action>[:<scope>].
 * The server syncs this file to the `permissions` table on startup
 * (see permissionService.syncPermissions).
 */

const WILDCARD = '*';

const PERMISSIONS = {
    // Catalog
    PRODUCT_CREATE:             'product:create',
    PRODUCT_UPDATE_OWN:         'product:update:own',
    PRODUCT_UPDATE_ANY:         'product:update:any',
    PRODUCT_DELETE_OWN:         'product:delete:own',
    PRODUCT_DELETE_ANY:         'product:delete:any',
    PRODUCT_ASSIGN_VENDOR:      'product:assign_vendor',
    CATEGORY_CREATE:            'category:create',
    CATEGORY_UPDATE:            'category:update',
    CATEGORY_DELETE:            'category:delete',

    // Buyer
    CHECKOUT_PLACE_ORDER:       'checkout:place_order',
    ORDER_READ_OWN:             'order:read:own',
    ORDER_CANCEL_OWN:           'order:cancel:own',
    ORDER_RETURN_OWN:           'order:return:own',
    ORDER_NOTE_OWN:             'order:note:own',

    // Vendor
    VENDOR_ORDER_READ_OWN:      'vendor_order:read:own',
    VENDOR_ORDER_READ_ANY:      'vendor_order:read:any',
    VENDOR_ORDER_FULFIL_OWN:    'vendor_order:fulfil:own',
    VENDOR_ORDER_NOTE_OWN:      'vendor_order:note:own',
    VENDOR_DASHBOARD_READ:      'vendor_dashboard:read',

    // Platform orders
    ORDER_READ_ANY:             'order:read:any',
    ORDER_UPDATE_STATUS_ANY:    'order:update_status:any',
    ORDER_CONFIRM:              'order:confirm',
    ORDER_NOTE_ADMIN:           'order:note:admin',
    ORDER_CANCELLATION_PROCESS: 'order:cancellation:process',
    ORDER_RETURN_PROCESS:       'order:return:process',
    ORDER_REFUND:               'order:refund',

    // Users
    USER_READ_ANY:              'user:read:any',
    USER_UPDATE_STATUS:         'user:update_status',
    USER_DELETE:                'user:delete',
    VENDOR_REQUEST_REVIEW:      'vendor_request:review',
    ADMIN_DASHBOARD_READ:       'admin_dashboard:read',

    // RBAC
    ROLE_READ:                  'role:read',
    ROLE_MANAGE:                'role:manage',
    USER_ROLE_ASSIGN:           'user_role:assign'
};

const P = PERMISSIONS;

// Permission groups: named sets of permissions that go together. Roles are built from them.
const GROUPS = {
    SHOPPING:        [P.CHECKOUT_PLACE_ORDER, P.ORDER_READ_OWN, P.ORDER_CANCEL_OWN, P.ORDER_RETURN_OWN, P.ORDER_NOTE_OWN],
    CATALOG_OWN:     [P.PRODUCT_CREATE, P.PRODUCT_UPDATE_OWN, P.PRODUCT_DELETE_OWN],
    FULFILMENT_OWN:  [P.VENDOR_ORDER_READ_OWN, P.VENDOR_ORDER_FULFIL_OWN, P.VENDOR_ORDER_NOTE_OWN, P.VENDOR_DASHBOARD_READ],
    CATALOG_ADMIN:   [P.PRODUCT_CREATE, P.PRODUCT_UPDATE_ANY, P.PRODUCT_DELETE_ANY, P.PRODUCT_ASSIGN_VENDOR,
                      P.CATEGORY_CREATE, P.CATEGORY_UPDATE, P.CATEGORY_DELETE],
    ORDER_OVERSIGHT: [P.ORDER_READ_ANY, P.ORDER_UPDATE_STATUS_ANY, P.ORDER_CONFIRM, P.ORDER_NOTE_ADMIN,
                      P.ORDER_CANCELLATION_PROCESS, P.ORDER_RETURN_PROCESS, P.ORDER_REFUND, P.VENDOR_ORDER_READ_ANY],
    USER_ADMIN:      [P.USER_READ_ANY, P.USER_UPDATE_STATUS, P.USER_DELETE, P.VENDOR_REQUEST_REVIEW,
                      P.USER_ROLE_ASSIGN, P.ADMIN_DASHBOARD_READ],
    RBAC_ADMIN:      [P.ROLE_READ, P.ROLE_MANAGE]
};

const fromGroups = (...groups) => [...new Set(groups.flat())];

// Default permissions of each system role. Applied once, when a permission is new.
const DEFAULT_ROLE_PERMISSIONS = {
    customer:       fromGroups(GROUPS.SHOPPING),
    vendor_pending: fromGroups(GROUPS.SHOPPING),
    vendor:         fromGroups(GROUPS.CATALOG_OWN, GROUPS.FULFILMENT_OWN),
    admin:          fromGroups(GROUPS.CATALOG_ADMIN, GROUPS.ORDER_OVERSIGHT, GROUPS.USER_ADMIN, [P.ROLE_READ]),
    super_admin:    [WILDCARD]
};

module.exports = { WILDCARD, PERMISSIONS, GROUPS, DEFAULT_ROLE_PERMISSIONS };
