const logger = require('../config/logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Convert errors to ApiError instances
 */
const convertToApiError = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  next(error);
};

/**
 * Central error handler
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Default to 500 if no status code
  statusCode = statusCode || 500;

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  } else {
    logger.warn('Client Error:', {
      message: err.message,
      path: req.path,
      method: req.method,
      statusCode
    });
  }

  // Prepare error response
  const response = {
    success: false,
    error: message,
    statusCode
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    response.error = 'Validation Error';
    response.details = err.details;
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    response.error = 'Unauthorized';
  }

  if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    response.error = 'Invalid CSRF token';
  }

  // Handle Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    statusCode = 400;
    response.error = 'Database operation failed';
    if (process.env.NODE_ENV === 'development') {
      response.details = err.message;
    }
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch async errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized success response
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Create standardized error response
 */
const errorResponse = (res, message, statusCode = 400, details = null) => {
  const response = {
    success: false,
    error: message,
    statusCode
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  ApiError,
  convertToApiError,
  errorHandler,
  asyncHandler,
  successResponse,
  errorResponse
};
