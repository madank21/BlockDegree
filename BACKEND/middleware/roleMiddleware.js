const { sendError } = require('../src/utils/response');

/**
 * Role-based access control middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
        403
      );
    }

    next();
  };
};

/**
 * Check if user owns resource or is admin
 */
const authorizeOwnerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = req.user.id === req.params[resourceUserIdField] ||
                    req.user.id === req.body[resourceUserIdField];

    if (!isAdmin && !isOwner) {
      return sendError(res, 'Access denied. You can only access your own resources.', 403);
    }

    next();
  };
};

/**
 * University or Admin only
 */
const authorizeUniversityOrAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 401);
  }

  if (!['admin', 'university'].includes(req.user.role)) {
    return sendError(res, 'Access denied. University or Admin role required.', 403);
  }

  next();
};

/**
 * Admin only
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 401);
  }

  if (req.user.role !== 'admin') {
    return sendError(res, 'Access denied. Admin role required.', 403);
  }

  next();
};

module.exports = {
  authorize,
  authorizeOwnerOrAdmin,
  authorizeUniversityOrAdmin,
  authorizeAdmin,
};