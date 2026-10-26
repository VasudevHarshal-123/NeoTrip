const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const { asyncHandler, successResponse, errorResponse } = require('../../middleware/errorHandler');
const { validate, commonSchemas } = require('../../middleware/validation');
const { z } = require('zod');
const { supabaseAdmin, logAdminAction } = require('../../config/supabase');
const logger = require('../../config/logger');

/**
 * @route   GET /api/v1/settlements
 * @desc    Get all settlements with filters
 * @access  Private (Admin - Finance)
 */
const listSettlementsSchema = {
  query: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    status: z.enum(['pending_settlement', 'ready_for_review', 'approved', 'processing', 'completed', 'failed', 'on_hold', 'cancelled']).optional(),
    vendor_id: commonSchemas.uuid.optional(),
    sortBy: z.string().optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  })
};

router.get('/', 
  verifyToken, 
  requireAdmin, 
  validate(listSettlementsSchema), 
  asyncHandler(async (req, res) => {
    const { page, limit, status, vendor_id, sortBy, sortOrder } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('settlements')
      .select(`
        *,
        vendors (
          name,
          email,
          bank_account_holder_name,
          bank_account_number,
          bank_ifsc_code
        ),
        bookings (
          booking_date,
          activity_listings (
            title
          )
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }

    // Pagination and sorting
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: settlements, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch settlements:', error);
      return errorResponse(res, 'Failed to fetch settlements', 500);
    }

    return successResponse(res, {
      settlements,
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
 * @route   GET /api/v1/settlements/:id
 * @desc    Get settlement details
 * @access  Private (Admin - Finance)
 */
const getSettlementSchema = {
  params: z.object({
    id: commonSchemas.uuid
  })
};

router.get('/:id', 
  verifyToken, 
  requireAdmin, 
  validate(getSettlementSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: settlement, error } = await supabaseAdmin
      .from('settlements')
      .select(`
        *,
        vendors (
          name,
          email,
          phone,
          company_name,
          bank_account_holder_name,
          bank_account_number,
          bank_ifsc_code,
          bank_name,
          upi_id
        ),
        bookings (
          booking_date,
          number_of_participants,
          activity_listings (
            title,
            city,
            state
          )
        ),
        payments (
          amount,
          payment_gateway,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !settlement) {
      return errorResponse(res, 'Settlement not found', 404);
    }

    return successResponse(res, { settlement });
  })
);

/**
 * @route   PUT /api/v1/settlements/:id/approve
 * @desc    Approve settlement for payment
 * @access  Private (Admin - Finance only)
 */
const approveSettlementSchema = {
  params: z.object({
    id: commonSchemas.uuid
  }),
  body: z.object({
    review_notes: z.string().optional()
  })
};

router.put('/:id/approve', 
  verifyToken, 
  requireAdmin, 
  validate(approveSettlementSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { review_notes } = req.body;

    // Check if user has finance role
    if (req.user.adminRole !== 'super_admin' && req.user.adminRole !== 'finance') {
      return errorResponse(res, 'Only finance team can approve settlements', 403);
    }

    // Get settlement details
    const { data: settlement, error: fetchError } = await supabaseAdmin
      .from('settlements')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !settlement) {
      return errorResponse(res, 'Settlement not found', 404);
    }

    if (settlement.status !== 'ready_for_review') {
      return errorResponse(res, 'Only settlements in ready_for_review status can be approved', 400);
    }

    // Update settlement
    const { data: updatedSettlement, error: updateError } = await supabaseAdmin
      .from('settlements')
      .update({
        status: 'approved',
        review_notes,
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to approve settlement:', updateError);
      return errorResponse(res, 'Failed to approve settlement', 500);
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user.id,
      action: 'settlement_approved',
      entityType: 'settlement',
      entityId: id,
      notes: review_notes
    });

    logger.info('Settlement approved:', { settlementId: id, adminId: req.user.id });

    return successResponse(res, { settlement: updatedSettlement }, 'Settlement approved successfully');
  })
);

/**
 * @route   PUT /api/v1/settlements/:id/complete
 * @desc    Mark settlement as completed (payment made)
 * @access  Private (Admin - Finance only)
 */
const completeSettlementSchema = {
  params: z.object({
    id: commonSchemas.uuid
  }),
  body: z.object({
    payout_method: z.enum(['bank_transfer', 'upi']),
    payout_reference: z.string().min(1, { message: 'Payout reference is required' }),
    notes: z.string().optional()
  })
};

router.put('/:id/complete', 
  verifyToken, 
  requireAdmin, 
  validate(completeSettlementSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { payout_method, payout_reference, notes } = req.body;

    // Check if user has finance role
    if (req.user.adminRole !== 'super_admin' && req.user.adminRole !== 'finance') {
      return errorResponse(res, 'Only finance team can complete settlements', 403);
    }

    // Get settlement details
    const { data: settlement, error: fetchError } = await supabaseAdmin
      .from('settlements')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !settlement) {
      return errorResponse(res, 'Settlement not found', 404);
    }

    if (settlement.status !== 'approved' && settlement.status !== 'processing') {
      return errorResponse(res, 'Only approved or processing settlements can be completed', 400);
    }

    // Update settlement
    const { data: updatedSettlement, error: updateError } = await supabaseAdmin
      .from('settlements')
      .update({
        status: 'completed',
        payout_method,
        payout_reference,
        payout_completed_at: new Date().toISOString(),
        review_notes: notes || settlement.review_notes
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to complete settlement:', updateError);
      return errorResponse(res, 'Failed to complete settlement', 500);
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user.id,
      action: 'settlement_completed',
      entityType: 'settlement',
      entityId: id,
      notes: `Payout method: ${payout_method}, Reference: ${payout_reference}`
    });

    logger.info('Settlement completed:', { settlementId: id, adminId: req.user.id });

    return successResponse(res, { settlement: updatedSettlement }, 'Settlement marked as completed');
  })
);

/**
 * @route   GET /api/v1/settlements/stats/overview
 * @desc    Get settlement statistics
 * @access  Private (Admin - Finance)
 */
router.get('/stats/overview', 
  verifyToken, 
  requireAdmin, 
  asyncHandler(async (req, res) => {
    // Get all settlements
    const { data: settlements, error } = await supabaseAdmin
      .from('settlements')
      .select('status, vendor_payout_amount, commission_amount');

    if (error) {
      logger.error('Failed to fetch settlement stats:', error);
      return errorResponse(res, 'Failed to fetch statistics', 500);
    }

    const stats = {
      total: settlements.length,
      byStatus: {},
      totalPayout: 0,
      totalCommission: 0,
      pendingPayout: 0
    };

    settlements.forEach(settlement => {
      stats.byStatus[settlement.status] = (stats.byStatus[settlement.status] || 0) + 1;
      
      const payoutAmount = parseFloat(settlement.vendor_payout_amount);
      const commissionAmount = parseFloat(settlement.commission_amount);
      
      stats.totalPayout += payoutAmount;
      stats.totalCommission += commissionAmount;
      
      if (['pending_settlement', 'ready_for_review', 'approved'].includes(settlement.status)) {
        stats.pendingPayout += payoutAmount;
      }
    });

    return successResponse(res, stats);
  })
);

module.exports = router;
