

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  vendor: 2,
  customer: 1
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

const authorizeMinRole =  (minRole) => {
    return (req,res,next) => {
        if(!req.user){
            return res.status(401).json({
                error:'Authentication required'
            });
        }

        const userRole = req.user.role;
        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const minLevel = ROLE_HIERARCHY[[minRole]] || 0;

        if(userLevel < minLevel){
            return res.status(403).json({
                error:'Access denied. Insufficient permisions',
                minimumRole:minRole,
                yourRole:userRole
            });
        }
        next();
    };
};

const isAdmin = authorize('admin', 'super_admin');


const isSuperAdmin = authorize('super_admin');

const isVendorOrAdmin = authorize('vendor', 'admin', 'super_admin');

module.exports = {
  authorize,
  authorizeMinRole,
  isAdmin,
  isSuperAdmin,
  isVendorOrAdmin
};
