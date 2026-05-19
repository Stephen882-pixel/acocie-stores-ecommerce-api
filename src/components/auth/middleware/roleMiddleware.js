

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  vendor: 2,
  customer: 1,
  vendor_pending: 0
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        yourRole: userRole
      });
    }

    next();
  };
};

/**
 * authorizeMinRole(minRole)
 * Allow any role whose hierarchy level is >= the minimum.
 */
const authorizeMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole  = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole]  ?? 0;
    const minLevel  = ROLE_HIERARCHY[minRole]   ?? 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        minimumRole: minRole,
        yourRole: userRole
      });
    }
    next();
  };
};


const isCustomer = authorize('customer', 'vendor_pending');

const isVendor = authorize('vendor');

const isVendorOrAdmin = authorize('vendor', 'admin', 'super_admin');

const isAdmin = authorize('admin', 'super_admin');

const isSuperAdmin = authorize('super_admin');

module.exports = {
  authorize,
  authorizeMinRole,
  isCustomer,
  isVendor,
  isVendorOrAdmin,
  isAdmin,
  isSuperAdmin
};
