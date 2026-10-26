const { z } = require('zod');
const { ApiError } = require('./errorHandler');
const logger = require('../config/logger');

/**
 * Validate request data against Zod schema
 * @param {Object} schema - Zod schema object with optional body, query, params
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate body
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      // Validate URL parameters
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Validation failed:', {
          path: req.path,
          errors: formattedErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors
        });
      }

      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid({ message: 'Invalid UUID format' }),

  // Pagination
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  // Status filter
  status: z.enum(['pending', 'approved', 'rejected', 'active', 'inactive', 'suspended']).optional(),

  // Email
  email: z.string().email({ message: 'Invalid email address' }),

  // Phone (Indian format)
  phone: z.string().regex(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' }).optional(),

  // Price
  price: z.number().positive({ message: 'Price must be positive' }).optional(),

  // Percentage
  percentage: z.number().min(0).max(100, { message: 'Percentage must be between 0 and 100' }).optional()
};

/**
 * Sanitize input data
 */
const sanitize = (data) => {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, '');
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitize(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Middleware to sanitize request data
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  next();
};

module.exports = {
  validate,
  commonSchemas,
  sanitizeInput
};
