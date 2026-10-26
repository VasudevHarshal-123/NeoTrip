const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin, requirePermission } = require('../../middleware/auth');
const { asyncHandler, successResponse, errorResponse } = require('../../middleware/errorHandler');
const { validate, commonSchemas } = require('../../middleware/validation');
const { z } = require('zod');
const { supabaseAdmin, logAdminAction } = require('../../config/supabase');
const logger = require('../../config/logger');

/**
 * @route   GET /api/v1/vendors
 * @desc    Get all vendors with filters
 * @access  Private (Admin)
 */
const listVendorsSchema = {
  query: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
    search: z.string().optional(),
    sortBy: z.string().optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  })
};

router.get('/', 
  verifyToken, 
  requireAdmin, 
  validate(listVendorsSchema), 
  asyncHandler(async (req, res) => {
    const { page, limit, status, search, sortBy, sortOrder } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('vendors')
      .select(`
        *,
        users!vendors_user_id_fkey (
          full_name,
          email,
          phone
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    // Pagination and sorting
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: vendors, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch vendors:', error);
      return errorResponse(res, 'Failed to fetch vendors', 500);
    }

    return successResponse(res, {
      vendors,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  })
);

/**
 * @route   GET /api/v1/vendors/:id
 * @desc    Get vendor details by ID
 * @access  Private (Admin)
 */
const getVendorSchema = {
  params: z.object({
    id: commonSchemas.uuid
  })
};

router.get('/:id', 
  verifyToken, 
  requireAdmin, 
  validate(getVendorSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .select(`
        *,
        users!vendors_user_id_fkey (
          full_name,
          email,
          phone,
          avatar_url,
          created_at
        ),
        vendor_activities (
          id,
          status,
          activities_master (
            name,
            category
          )
        ),
        vendor_documents (
          id,
          document_category,
          document_type,
          status,
          file_url,
          expiry_date
        )
      `)
      .eq('id', id)
      .single();

    if (error || !vendor) {
      return errorResponse(res, 'Vendor not found', 404);
    }

    return successResponse(res, { vendor });
  })
);

/**
 * @route   PUT /api/v1/vendors/:id/approve
 * @desc    Approve vendor
 * @access  Private (Admin - requires approval permission)
 */
const approveVendorSchema = {
  params: z.object({
    id: commonSchemas.uuid
  }),
  body: z.object({
    approval_notes: z.string().optional()
  })
};

router.put('/:id/approve', 
  verifyToken, 
  requireAdmin, 
  validate(approveVendorSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { approval_notes } = req.body;

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .update({
        status: 'approved',
        approval_notes,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to approve vendor:', error);
      return errorResponse(res, 'Failed to approve vendor', 500);
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user.id,
      action: 'vendor_approved',
      entityType: 'vendor',
      entityId: id,
      notes: approval_notes
    });

    logger.info('Vendor approved:', { vendorId: id, adminId: req.user.id });

    return successResponse(res, { vendor }, 'Vendor approved successfully');
  })
);

/**
 * @route   PUT /api/v1/vendors/:id/reject
 * @desc    Reject vendor
 * @access  Private (Admin - requires approval permission)
 */
const rejectVendorSchema = {
  params: z.object({
    id: commonSchemas.uuid
  }),
  body: z.object({
    approval_notes: z.string().min(10, { message: 'Rejection reason must be at least 10 characters' })
  })
};

router.put('/:id/reject', 
  verifyToken, 
  requireAdmin, 
  validate(rejectVendorSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { approval_notes } = req.body;

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .update({
        status: 'rejected',
        approval_notes,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to reject vendor:', error);
      return errorResponse(res, 'Failed to reject vendor', 500);
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user.id,
      action: 'vendor_rejected',
      entityType: 'vendor',
      entityId: id,
      notes: approval_notes
    });

    logger.info('Vendor rejected:', { vendorId: id, adminId: req.user.id });

    return successResponse(res, { vendor }, 'Vendor rejected');
  })
);

/**
 * @route   PUT /api/v1/vendors/:id/suspend
 * @desc    Suspend vendor
 * @access  Private (Admin - super_admin only)
 */
const suspendVendorSchema = {
  params: z.object({
    id: commonSchemas.uuid
  }),
  body: z.object({
    reason: z.string().min(10, { message: 'Suspension reason must be at least 10 characters' })
  })
};

router.put('/:id/suspend', 
  verifyToken, 
  requireAdmin, 
  validate(suspendVendorSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    // Only super_admin can suspend
    if (req.user.adminRole !== 'super_admin') {
      return errorResponse(res, 'Only super admins can suspend vendors', 403);
    }

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .update({
        status: 'suspended',
        approval_notes: reason
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to suspend vendor:', error);
      return errorResponse(res, 'Failed to suspend vendor', 500);
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user.id,
      action: 'vendor_suspended',
      entityType: 'vendor',
      entityId: id,
      notes: reason
    });

    logger.warn('Vendor suspended:', { vendorId: id, adminId: req.user.id, reason });

    return successResponse(res, { vendor }, 'Vendor suspended');
  })
);

/**
 * @route   GET /api/v1/vendors/stats/overview
 * @desc    Get vendor statistics
 * @access  Private (Admin)
 */
router.get('/stats/overview', 
  verifyToken, 
  requireAdmin, 
  asyncHandler(async (req, res) => {
    // Get counts by status
    const { data: stats, error } = await supabaseAdmin
      .from('vendors')
      .select('status', { count: 'exact' });

    if (error) {
      logger.error('Failed to fetch vendor stats:', error);
      return errorResponse(res, 'Failed to fetch statistics', 500);
    }

    const statusCounts = stats.reduce((acc, vendor) => {
      acc[vendor.status] = (acc[vendor.status] || 0) + 1;
      return acc;
    }, {});

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentCount } = await supabaseAdmin
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    return successResponse(res, {
      total: stats.length,
      byStatus: statusCounts,
      recentRegistrations: recentCount
    });
  })
);

module.exports = router;
