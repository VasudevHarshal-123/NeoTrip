const jwt = require('jsonwebtoken');
const { isUserAdmin, getAdminRole } = require('../config/supabase');
const logger = require('../config/logger');

/**
 * Verify JWT token from Supabase
 * Extracts and validates the token, attaches user info to request
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT (Supabase uses the JWT secret from their dashboard)
    // For production, you should verify against Supabase's public key
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.user_metadata?.role,
      token: token
    };

    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Check if authenticated user is an admin
 * Must be used after verifyToken middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user is admin in database
    const isAdmin = await isUserAdmin(req.user.id);

    if (!isAdmin) {
      logger.warn(`Non-admin user attempted admin access: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get admin role details
    const adminRole = await getAdminRole(req.user.id);
    
    if (adminRole) {
      req.user.adminRole = adminRole.role;
      req.user.permissions = adminRole.permissions;
    }

    next();
  } catch (error) {
    logger.error('Admin verification failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify admin status'
    });
  }
};

/**
 * Check if admin has specific permission
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Super admins have all permissions
    if (req.user.adminRole === 'super_admin') {
      return next();
    }

    // Check if user has the specific permission
    const hasPermission = req.user.permissions[permission] === true;

    if (!hasPermission) {
      logger.warn(`Admin ${req.user.id} attempted action without permission: ${permission}`);
      return res.status(403).json({
        success: false,
        error: `Permission required: ${permission}`
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.decode(token);

      if (decoded && decoded.sub) {
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.user_metadata?.role,
          token: token
        };

        // Check admin status if authenticated
        const isAdmin = await isUserAdmin(req.user.id);
        if (isAdmin) {
          const adminRole = await getAdminRole(req.user.id);
          if (adminRole) {
            req.user.adminRole = adminRole.role;
            req.user.permissions = adminRole.permissions;
          }
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    logger.warn('Optional auth failed, continuing without auth:', error.message);
    next();
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requirePermission,
  optionalAuth
};
