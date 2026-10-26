const logger = require('../config/logger');

/**
 * 404 Not Found handler
 * Should be placed after all route handlers
 */
const notFound = (req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(404).json({
    success: false,
    error: 'Resource not found',
    path: req.originalUrl,
    method: req.method
  });
};

module.exports = { notFound };
