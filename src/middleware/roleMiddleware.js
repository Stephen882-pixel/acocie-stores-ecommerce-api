

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

