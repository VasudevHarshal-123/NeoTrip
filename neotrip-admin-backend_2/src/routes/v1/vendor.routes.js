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
 * @desc    Get all vendors with extended info (counts, activities, documents)
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

    // Build base query with joins
    let query = supabaseAdmin
      .from('vendors')
      .select(`
        id,
        user_id,
        name,
        email,
        phone,
        company_name,
        status,
        onboarding_completed,
        onboarding_step,
        created_at,
        updated_at,
        approved_at
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%`);
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

    // Fetch extended data for each vendor
    const vendorsWithCounts = await Promise.all(vendors.map(async (vendor) => {
      // Get activity counts
      const { count: totalActivities } = await supabaseAdmin
        .from('vendor_activities')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id);

      const { count: pendingActivities } = await supabaseAdmin
        .from('vendor_activities')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('status', 'pending');

      // Get activity listing counts
      const { count: totalListings } = await supabaseAdmin
        .from('activity_listings')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id);

      const { count: draftListings } = await supabaseAdmin
        .from('activity_listings')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('status', 'draft');

      // Get document counts
      const { count: totalDocuments } = await supabaseAdmin
        .from('vendor_documents')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id);

      const { count: pendingDocuments } = await supabaseAdmin
        .from('vendor_documents')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('status', 'pending');

      // Get last login from users table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('last_login_at')
        .eq('id', vendor.user_id)
        .single();

      return {
        ...vendor,
        counts: {
          total_activities: totalActivities || 0,
          pending_activities: pendingActivities || 0,
          total_listings: totalListings || 0,
          draft_listings: draftListings || 0,
          total_documents: totalDocuments || 0,
          pending_documents: pendingDocuments || 0
        },
        last_login_at: userData?.last_login_at || null
      };
    }));

    return successResponse(res, {
      vendors: vendorsWithCounts,
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
 * @desc    Get comprehensive vendor details with activities, documents, and statistics
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

    // 1. Get vendor basic info
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (vendorError || !vendor) {
      return errorResponse(res, 'Vendor not found', 404);
    }

    // 2. Get user profile data
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name, phone, city, state, country, last_login_at, created_at')
      .eq('id', vendor.user_id)
      .single();

    // 3. Get auth email
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(vendor.user_id);

    // 4. Get vendor activities with activity master details
    const { data: activities } = await supabaseAdmin
      .from('vendor_activities')
      .select(`
        id,
        status,
        created_at,
        approved_at,
        approval_notes,
        activities_master (
          id,
          name,
          category,
          slug
        )
      `)
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    // 5. Get activity listings created by vendor
    const { data: listings } = await supabaseAdmin
      .from('activity_listings')
      .select(`
        id,
        title,
        status,
        is_published,
        duration_type,
        city,
        state,
        created_at,
        approved_at
      `)
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    // 6. Get vendor documents
    const { data: documents } = await supabaseAdmin
      .from('vendor_documents')
      .select(`
        id,
        document_category,
        document_type,
        custom_document_name,
        file_url,
        file_name,
        file_size,
        status,
        has_expiry,
        expiry_date,
        uploaded_at,
        approved_at,
        approval_notes
      `)
      .eq('vendor_id', id)
      .order('uploaded_at', { ascending: false });

    // 7. Get statistics - bookings
    const { count: totalBookings } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', id);

    const { count: completedBookings } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', id)
      .eq('status', 'completed');

    // 8. Get revenue statistics
    const { data: revenueData } = await supabaseAdmin
      .from('bookings')
      .select('final_amount')
      .eq('vendor_id', id)
      .in('status', ['confirmed', 'completed']);

    const totalRevenue = revenueData?.reduce((sum, booking) => sum + parseFloat(booking.final_amount || 0), 0) || 0;

    // 9. Get reviews and ratings
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('vendor_id', id)
      .eq('is_published', true);

    const avgRating = reviews?.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // 10. Get commission settings
    const { data: commissionSettings } = await supabaseAdmin
      .from('vendor_commission_settings')
      .select('*')
      .eq('vendor_id', id)
      .single();

    // Compile comprehensive response
    const comprehensiveVendor = {
      // Basic vendor information
      basic_info: {
        id: vendor.id,
        user_id: vendor.user_id,
        name: vendor.name,
        email: authData?.user?.email || vendor.email,
        phone: vendor.phone,
        company_name: vendor.company_name,
        full_name: userData?.full_name,
        city: userData?.city,
        state: userData?.state,
        country: userData?.country,
        last_login_at: userData?.last_login_at
      },

      // Bank details
      bank_details: {
        account_holder_name: vendor.bank_account_holder_name,
        account_number: vendor.bank_account_number,
        ifsc_code: vendor.bank_ifsc_code,
        bank_name: vendor.bank_name,
        bank_branch: vendor.bank_branch,
        upi_id: vendor.upi_id,
        gstin: vendor.gstin,
        pan_number: vendor.pan_number
      },

      // Approval status and history
      approval_info: {
        status: vendor.status,
        onboarding_completed: vendor.onboarding_completed,
        onboarding_step: vendor.onboarding_step,
        approval_notes: vendor.approval_notes,
        approved_at: vendor.approved_at,
        created_at: vendor.created_at,
        updated_at: vendor.updated_at
      },

      // Activities
      activities: {
        total: activities?.length || 0,
        list: activities || [],
        by_status: {
          pending: activities?.filter(a => a.status === 'pending').length || 0,
          approved: activities?.filter(a => a.status === 'approved').length || 0,
          rejected: activities?.filter(a => a.status === 'rejected').length || 0
        }
      },

      // Activity Listings
      listings: {
        total: listings?.length || 0,
        list: listings || [],
        by_status: {
          draft: listings?.filter(l => l.status === 'draft').length || 0,
          pending: listings?.filter(l => l.status === 'pending').length || 0,
          approved: listings?.filter(l => l.status === 'approved').length || 0,
          active: listings?.filter(l => l.status === 'active').length || 0
        }
      },

      // Documents
      documents: {
        total: documents?.length || 0,
        list: documents || [],
        by_category: {
          vendor_kyc: documents?.filter(d => d.document_category === 'vendor_kyc').length || 0,
          activity_license: documents?.filter(d => d.document_category === 'activity_license').length || 0
        },
        by_status: {
          pending: documents?.filter(d => d.status === 'pending').length || 0,
          approved: documents?.filter(d => d.status === 'approved').length || 0,
          rejected: documents?.filter(d => d.status === 'rejected').length || 0,
          expired: documents?.filter(d => d.status === 'expired').length || 0
        }
      },

      // Statistics
      statistics: {
        total_bookings: totalBookings || 0,
        completed_bookings: completedBookings || 0,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        average_rating: Math.round(avgRating * 10) / 10,
        total_reviews: reviews?.length || 0
      },

      // Commission settings
      commission_settings: commissionSettings || {
        commission_percentage: 15.00,
        cancellation_window_hours: 48,
        settlement_cycle: 'weekly'
      }
    };

    return successResponse(res, { vendor: comprehensiveVendor });
  })
);

/**
 * @route   GET /api/v1/vendors/:id/activities
 * @desc    Get all activities for a specific vendor
 * @access  Private (Admin)
 */
router.get('/:id/activities',
  verifyToken,
  requireAdmin,
  validate(getVendorSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: activities, error } = await supabaseAdmin
      .from('vendor_activities')
      .select(`
        *,
        activities_master (
          id,
          name,
          slug,
          category,
          description,
          requires_license
        ),
        activity_listings (
          id,
          title,
          status,
          is_published,
          created_at
        )
      `)
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch vendor activities:', error);
      return errorResponse(res, 'Failed to fetch activities', 500);
    }

    return successResponse(res, { activities: activities || [] });
  })
);

/**
 * @route   GET /api/v1/vendors/:id/documents
 * @desc    Get all documents for a specific vendor
 * @access  Private (Admin)
 */
router.get('/:id/documents',
  verifyToken,
  requireAdmin,
  validate(getVendorSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: documents, error } = await supabaseAdmin
      .from('vendor_documents')
      .select('*')
      .eq('vendor_id', id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch vendor documents:', error);
      return errorResponse(res, 'Failed to fetch documents', 500);
    }

    return successResponse(res, { documents: documents || [] });
  })
);

/**
 * @route   GET /api/v1/vendors/:id/listings
 * @desc    Get all activity listings created by vendor
 * @access  Private (Admin)
 */
router.get('/:id/listings',
  verifyToken,
  requireAdmin,
  validate(getVendorSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: listings, error } = await supabaseAdmin
      .from('activity_listings')
      .select(`
        *,
        activities_master (
          name,
          category
        ),
        activity_pricing (
          base_price,
          currency
        )
      `)
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch vendor listings:', error);
      return errorResponse(res, 'Failed to fetch listings', 500);
    }

    return successResponse(res, { listings: listings || [] });
  })
);

/**
 * @route   PUT /api/v1/vendors/:id/approve
 * @desc    Approve vendor profile (Step 1 of multi-step approval)
 * @access  Private (Admin)
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
 * @route   PUT /api/v1/vendors/documents/:documentId/approve
 * @desc    Approve vendor document (Step 2 of multi-step approval)
 * @access  Private (Admin)
 */
const approveDocumentSchema = {
  params: z.object({
    documentId: commonSchemas.uuid
  }),
  body: z.object({
    approval_notes: z.string().optional()
  })
};

router.put('/documents/:documentId/approve',
  verifyToken,
  requireAdmin,
  validate(approveDocumentSchema),
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { approval_notes } = req.body;

    const { data: document, error } = await supabaseAdmin
      .from('vendor_documents')
      .update({
        status: 'approved',
        approval_notes,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to approve document:', error);
      return errorResponse(res, 'Failed to approve document', 500);
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'document_approved',
      entityType: 'vendor_document',
      entityId: documentId,
      notes: approval_notes
    });

    return successResponse(res, { document }, 'Document approved successfully');
  })
);

/**
 * @route   PUT /api/v1/vendors/documents/:documentId/reject
 * @desc    Reject vendor document
 * @access  Private (Admin)
 */
const rejectDocumentSchema = {
  params: z.object({
    documentId: commonSchemas.uuid
  }),
  body: z.object({
    approval_notes: z.string().min(10, { message: 'Rejection reason must be at least 10 characters' })
  })
};

router.put('/documents/:documentId/reject',
  verifyToken,
  requireAdmin,
  validate(rejectDocumentSchema),
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { approval_notes } = req.body;

    const { data: document, error } = await supabaseAdmin
      .from('vendor_documents')
      .update({
        status: 'rejected',
        approval_notes,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to reject document:', error);
      return errorResponse(res, 'Failed to reject document', 500);
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'document_rejected',
      entityType: 'vendor_document',
      entityId: documentId,
      notes: approval_notes
    });

    return successResponse(res, { document }, 'Document rejected');
  })
);

/**
 * @route   PUT /api/v1/vendors/activities/:activityId/approve
 * @desc    Approve vendor activity (Step 3 of multi-step approval)
 * @access  Private (Admin)
 */
const approveActivitySchema = {
  params: z.object({
    activityId: commonSchemas.uuid
  }),
  body: z.object({
    approval_notes: z.string().optional()
  })
};

router.put('/activities/:activityId/approve',
  verifyToken,
  requireAdmin,
  validate(approveActivitySchema),
  asyncHandler(async (req, res) => {
    const { activityId } = req.params;
    const { approval_notes } = req.body;

    const { data: activity, error } = await supabaseAdmin
      .from('vendor_activities')
      .update({
        status: 'approved',
        approval_notes,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to approve activity:', error);
      return errorResponse(res, 'Failed to approve activity', 500);
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'vendor_activity_approved',
      entityType: 'vendor_activity',
      entityId: activityId,
      notes: approval_notes
    });

    return successResponse(res, { activity }, 'Activity approved successfully');
  })
);

/**
 * @route   PUT /api/v1/vendors/activities/:activityId/reject
 * @desc    Reject vendor activity
 * @access  Private (Admin)
 */
const rejectActivitySchema = {
  params: z.object({
    activityId: commonSchemas.uuid
  }),
  body: z.object({
    approval_notes: z.string().min(10, { message: 'Rejection reason must be at least 10 characters' })
  })
};

router.put('/activities/:activityId/reject',
  verifyToken,
  requireAdmin,
  validate(rejectActivitySchema),
  asyncHandler(async (req, res) => {
    const { activityId } = req.params;
    const { approval_notes } = req.body;

    const { data: activity, error } = await supabaseAdmin
      .from('vendor_activities')
      .update({
        status: 'rejected',
        approval_notes,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to reject activity:', error);
      return errorResponse(res, 'Failed to reject activity', 500);
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'vendor_activity_rejected',
      entityType: 'vendor_activity',
      entityId: activityId,
      notes: approval_notes
    });

    return successResponse(res, { activity }, 'Activity rejected');
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
