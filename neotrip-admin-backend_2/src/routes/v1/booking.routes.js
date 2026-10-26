const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../../middleware/auth');
const { asyncHandler, successResponse, errorResponse } = require('../../middleware/errorHandler');
const { validate, commonSchemas } = require('../../middleware/validation');
const { z } = require('zod');
const { supabaseAdmin, logAdminAction } = require('../../config/supabase');
const logger = require('../../config/logger');

/**
 * @route   GET /api/v1/bookings
 * @desc    Get all bookings with filters
 * @access  Private (Admin)
 */
const listBookingsSchema = {
  query: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    status: z.enum(['pending', 'confirmed', 'cancelled_by_customer', 'cancelled_by_vendor', 'completed', 'refunded', 'no_show']).optional(),
    vendor_id: commonSchemas.uuid.optional(),
    customer_id: commonSchemas.uuid.optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    sortBy: z.string().optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  })
};

router.get('/', 
  verifyToken, 
  requireAdmin, 
  validate(listBookingsSchema), 
  asyncHandler(async (req, res) => {
    const { page, limit, status, vendor_id, customer_id, start_date, end_date, sortBy, sortOrder } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        activity_listings (
          title,
          city,
          state
        ),
        vendors (
          name,
          email
        ),
        users!bookings_customer_id_fkey (
          full_name,
          email,
          phone
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (start_date) {
      query = query.gte('booking_date', start_date);
    }

    if (end_date) {
      query = query.lte('booking_date', end_date);
    }

    // Pagination and sorting
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: bookings, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch bookings:', error);
      return errorResponse(res, 'Failed to fetch bookings', 500);
    }

    return successResponse(res, {
      bookings,
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
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking details
 * @access  Private (Admin)
 */
const getBookingSchema = {
  params: z.object({
    id: commonSchemas.uuid
  })
};

router.get('/:id', 
  verifyToken, 
  requireAdmin, 
  validate(getBookingSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        activity_listings (
          title,
          description,
          city,
          state,
          duration_type
        ),
        vendors (
          name,
          email,
          phone,
          company_name
        ),
        users!bookings_customer_id_fkey (
          full_name,
          email,
          phone
        ),
        booking_participants (
          full_name,
          age,
          emergency_contact_name,
          emergency_contact_phone
        ),
        payments (
          amount,
          status,
          payment_gateway,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    return successResponse(res, { booking });
  })
);

/**
 * @route   PUT /api/v1/bookings/:id/cancel
 * @desc    Cancel booking (vendor cancellation)
 * @access  Private (Admin)
 */
const cancelBookingSchema = {
  params: z.object({
    id: commonSchemas.uuid
  }),
  body: z.object({
    reason: z.string().min(10, { message: 'Cancellation reason must be at least 10 characters' }),
    force_majeure: z.boolean().optional().default(false)
  })
};

router.put('/:id/cancel', 
  verifyToken, 
  requireAdmin, 
  validate(cancelBookingSchema), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, force_majeure } = req.body;

    // Get booking details
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.status !== 'confirmed') {
      return errorResponse(res, 'Only confirmed bookings can be cancelled', 400);
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled_by_vendor',
        cancellation_reason: reason,
        force_majeure_cancellation: force_majeure,
        refund_amount: force_majeure ? booking.final_amount : 0,
        refund_status: force_majeure ? 'pending' : null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to cancel booking:', updateError);
      return errorResponse(res, 'Failed to cancel booking', 500);
    }

    // Log admin action
    await logAdminAction({
      adminId: req.user.id,
      action: 'booking_cancelled',
      entityType: 'booking',
      entityId: id,
      notes: `Reason: ${reason}, Force Majeure: ${force_majeure}`
    });

    logger.info('Booking cancelled by admin:', { 
      bookingId: id, 
      adminId: req.user.id,
      forceMajeure: force_majeure
    });

    return successResponse(res, { booking: updatedBooking }, 'Booking cancelled successfully');
  })
);

/**
 * @route   GET /api/v1/bookings/stats/overview
 * @desc    Get booking statistics
 * @access  Private (Admin)
 */
router.get('/stats/overview', 
  verifyToken, 
  requireAdmin, 
  asyncHandler(async (req, res) => {
    // Get counts by status
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('status, final_amount');

    if (error) {
      logger.error('Failed to fetch booking stats:', error);
      return errorResponse(res, 'Failed to fetch statistics', 500);
    }

    const statusCounts = {};
    let totalRevenue = 0;

    bookings.forEach(booking => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        totalRevenue += parseFloat(booking.final_amount);
      }
    });

    // Get today's bookings
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('booking_date', today);

    return successResponse(res, {
      total: bookings.length,
      byStatus: statusCounts,
      totalRevenue,
      todayBookings: todayCount
    });
  })
);

module.exports = router;
