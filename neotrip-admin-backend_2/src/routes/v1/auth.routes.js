const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { validate, commonSchemas } = require('../../middleware/validation');
const { z } = require('zod');
const { supabaseAdmin, isUserAdmin, getAdminRole } = require('../../config/supabase');
const logger = require('../../config/logger');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Admin login (validates credentials via Supabase)
 * @access  Public
 */
const loginSchema = {
  body: z.object({
    email: commonSchemas.email,
    password: z.string().min(6, { message: 'Password must be at least 6 characters' })
  })
};

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Sign in with Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    logger.warn('Login attempt failed:', { email, error: authError.message });
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }

  // Check if user is admin
  const isAdmin = await isUserAdmin(authData.user.id);

  if (!isAdmin) {
    logger.warn('Non-admin user attempted to login to admin panel:', { email });
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  // Get admin role details
  const adminRole = await getAdminRole(authData.user.id);

  // Return user info and token
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: adminRole?.role || 'admin',
        permissions: adminRole?.permissions || {}
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at
      }
    }
  });

  logger.info('Admin login successful:', { email, userId: authData.user.id });
}));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
const refreshSchema = {
  body: z.object({
    refresh_token: z.string().min(1, { message: 'Refresh token is required' })
  })
};

router.post('/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token
  });

  if (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token'
    });
  }

  res.json({
    success: true,
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  });
}));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current admin user info
 * @access  Private (Admin)
 */
router.get('/me', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, user_type, created_at')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      user,
      adminRole: req.user.adminRole,
      permissions: req.user.permissions
    }
  });
}));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout admin user
 * @access  Private
 */
router.post('/logout', verifyToken, asyncHandler(async (req, res) => {
  // Supabase handles token invalidation client-side
  // This endpoint is mainly for logging purposes
  
  logger.info('Admin logout:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change admin password
 * @access  Private (Admin)
 */
const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8, { message: 'New password must be at least 8 characters' })
  })
};

router.post('/change-password', 
  verifyToken, 
  requireAdmin, 
  validate(changePasswordSchema), 
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });

    if (signInError) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { password: newPassword }
    );

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update password'
      });
    }

    logger.info('Admin password changed:', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

module.exports = router;
