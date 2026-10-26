# NeoTrip Database Schema Reference

## Overview
Complete database schema for NeoTrip adventure tourism marketplace.

---

## Core Tables

### 1. **users** - User Profiles
Extends Supabase auth.users with profile information for customers, vendors, and admins.

**Key Fields:**
- `id` (UUID, PK) - References auth.users(id)
- `user_type` - 'customer', 'vendor', or 'admin'
- `full_name`, `phone`, `avatar_url`
- `is_active`, `is_verified`, `email_verified`, `phone_verified`
- `city`, `state`, `country`, `pincode`
- `last_login_at`, `created_at`, `updated_at`

---

### 2. **vendors** - Vendor Business Information
Stores vendor profiles, approval status, onboarding progress, and bank details.

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `name`, `email`, `phone`, `company_name`
- **Bank Details:** `bank_account_holder_name`, `bank_account_number`, `bank_ifsc_code`, `bank_name`, `bank_branch`, `upi_id`, `gstin`, `pan_number`
- **Approval:** `status` ('pending', 'approved', 'rejected', 'suspended'), `approval_notes`, `approved_at`, `approved_by`
- **Onboarding:** `onboarding_completed`, `onboarding_step` (1-10)

**Indexes:**
- user_id, email, status

---

### 3. **activities_master** - Master List of Activities
System-maintained list of all adventure activities (parasailing, trekking, etc.).

**Key Fields:**
- `id` (UUID, PK)
- `name`, `slug`, `category` ('air', 'water', 'land', 'snow', 'wildlife')
- `description`
- `default_min_age`, `default_max_age`
- `requires_license`, `license_description`
- `is_active`

---

### 4. **vendor_activities** - Vendor-Activity Junction
Links vendors to activities they offer.

**Key Fields:**
- `id` (UUID, PK)
- `vendor_id` (FK → vendors)
- `activity_id` (FK → activities_master)
- `status` ('pending', 'approved', 'rejected')
- `approval_notes`, `approved_at`, `approved_by`

---

### 5. **vendor_documents** - KYC & License Documents
Stores vendor KYC documents and activity licenses.

**Key Fields:**
- `id` (UUID, PK)
- `vendor_id` (FK → vendors)
- `vendor_activity_id` (FK → vendor_activities, optional)
- `document_category` ('vendor_kyc', 'activity_license')
- `document_type`, `custom_document_name`
- `file_url`, `file_name`, `file_size`, `file_type`
- **Expiry:** `has_expiry`, `expiry_date`, `reminder_sent`, `reminder_sent_at`
- **Approval:** `status` ('pending', 'approved', 'rejected', 'expired'), `approval_notes`, `approved_at`, `approved_by`

**Constraints:**
- Max 12 files per vendor
- Max 1MB per file

---

### 6. **activity_listings** - Vendor Activity Listings
Activities created by vendors for customers to book.

**Key Fields:**
- `id` (UUID, PK)
- `vendor_activity_id` (FK → vendor_activities)
- `vendor_id` (FK → vendors)
- `activity_id` (FK → activities_master)
- `title`, `description`
- `duration_type` ('slot', 'single_day', 'multi_day'), `duration_value`, `duration_unit`
- `min_age`, `max_age`
- `inclusions`, `exclusions`, `requirements` (JSONB)
- `images` (JSONB, max 10)
- `city`, `state`, `country`, `timezone`, `pickup_points` (JSONB)
- **Capacity:** `min_participants`, `max_participants_per_slot`, `max_participants_per_day`
- `equipment_limited`, `equipment_count`
- **Status:** `status` ('draft', 'pending', 'approved', 'active', 'inactive', 'suspended'), `is_published`, `approval_notes`, `approved_at`, `approved_by`

---

### 7. **activity_pricing** - Dynamic Pricing Configuration
Pricing rules for activity listings.

**Key Fields:**
- `id` (UUID, PK)
- `listing_id` (FK → activity_listings)
- `base_price`, `currency` (default 'INR')
- **Dynamic Pricing:** `weekend_multiplier`, `peak_season_multiplier`, `festival_surcharge`
- **Season:** `season_type` ('regular', 'peak', 'off'), `season_start_date`, `season_end_date`
- **Group Discounts:** `group_size_threshold`, `group_discount_percent`
- `is_active`

---

### 8. **activity_schedules** - Activity Schedule Configuration
When activities are available.

**Key Fields:**
- `id` (UUID, PK)
- `listing_id` (FK → activity_listings)
- `schedule_type` ('daily', 'weekly', 'monthly', 'specific_dates', 'date_range')
- `days_of_week`, `dates_of_month`, `specific_dates` (JSONB)
- `start_date`, `end_date`
- `has_time_slots`
- `is_active`

---

### 9. **activity_time_slots** - Time Slot Configuration
Specific time slots for activities.

**Key Fields:**
- `id` (UUID, PK)
- `schedule_id` (FK → activity_schedules)
- `listing_id` (FK → activity_listings)
- `slot_name`, `start_time`, `end_time`
- `max_capacity`
- `price_override` (optional)
- `is_active`

---

### 10. **activity_availability** - Availability Overrides
Day-specific availability overrides.

**Key Fields:**
- `id` (UUID, PK)
- `listing_id` (FK → activity_listings)
- `time_slot_id` (FK → activity_time_slots, optional)
- `availability_date`
- `override_type` ('unavailable', 'custom_capacity', 'custom_price')
- `custom_capacity`, `offline_bookings`, `custom_price`, `reason`

---

### 11. **listing_daily_capacity** - Daily Capacity Tracking
Tracks bookings and capacity for each day.

**Key Fields:**
- `id` (UUID, PK)
- `listing_id` (FK → activity_listings)
- `time_slot_id` (FK → activity_time_slots, optional)
- `availability_date`
- **Capacity:** `total_capacity`, `booked_count`, `offline_bookings`, `available_capacity` (GENERATED)
- **Locking:** `booking_in_progress`, `last_booking_attempt_at`

---

### 12. **bookings** - Customer Bookings
Customer bookings for activities.

**Key Fields:**
- `id` (UUID, PK)
- `listing_id` (FK → activity_listings)
- `time_slot_id` (FK → activity_time_slots, optional)
- `customer_id` (FK → auth.users)
- `vendor_id` (FK → vendors)
- `booking_date`, `number_of_participants`
- **Multi-day:** `start_date`, `end_date`
- **Pricing:** `base_price_per_person`, `total_amount`, `discount_amount`, `final_amount`
- **Cancellation:** `cancellation_deadline`, `cancellation_window_hours`, `force_majeure_cancellation`
- `payment_expires_at` (15 minutes)
- **Status:** `status` ('pending', 'confirmed', 'cancelled_by_customer', 'cancelled_by_vendor', 'completed', 'refunded', 'no_show')
- `cancellation_reason`, `refund_amount`, `refund_status`

---

### 13. **booking_participants** - Participant Details
Details of each participant in a booking.

**Key Fields:**
- `id` (UUID, PK)
- `booking_id` (FK → bookings)
- `full_name`, `age`, `gender`
- **Emergency Contact:** `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`
- **Health:** `has_health_conditions`, `health_conditions`, `can_swim`, `fitness_level`
- **ID Proof:** `id_proof_type`, `id_proof_number`

---

### 14. **payments** - Payment Transactions
Payment records for bookings.

**Key Fields:**
- `id` (UUID, PK)
- `booking_id` (FK → bookings, UNIQUE)
- `customer_id` (FK → auth.users)
- `vendor_id` (FK → vendors)
- `amount`, `currency`
- **Gateway:** `payment_gateway` ('razorpay', 'stripe', 'paytm', 'cashfree'), `payment_gateway_order_id`, `payment_gateway_payment_id`, `payment_gateway_signature`
- **Status:** `status` ('pending', 'processing', 'success', 'failed', 'refund_pending', 'refunded')
- `webhook_verified`, `webhook_received_at`
- **Refund:** `refund_amount`, `refund_reason`, `refund_initiated_at`, `refund_completed_at`

---

### 15. **reviews** - Customer Reviews
Reviews and ratings for activity listings.

**Key Fields:**
- `id` (UUID, PK)
- `booking_id` (FK → bookings, UNIQUE)
- `listing_id` (FK → activity_listings)
- `vendor_id` (FK → vendors)
- `customer_id` (FK → auth.users)
- `rating` (1-5, REQUIRED)
- `title`, `comment` (optional)
- `contains_profanity`
- **Moderation:** `moderation_status` ('pending', 'auto_approved', 'flagged', 'approved', 'rejected'), `is_published`, `flag_reason`, `admin_notes`, `reviewed_by`, `reviewed_at`
- **Vendor Response:** `vendor_response`, `vendor_responded_at`

---

### 16. **settlements** - Vendor Payouts
Settlement and payout tracking for vendors.

**Key Fields:**
- `id` (UUID, PK)
- `vendor_id` (FK → vendors)
- `booking_id` (FK → bookings)
- `payment_id` (FK → payments)
- **Amount:** `booking_amount`, `commission_percentage`, `commission_amount`, `vendor_payout_amount`
- **Lifecycle:** `status` ('pending_settlement', 'ready_for_review', 'approved', 'processing', 'completed', 'failed', 'on_hold', 'cancelled')
- `eligible_for_settlement_at`
- **Approval:** `reviewed_by`, `reviewed_at`, `review_notes`, `approved_by`, `approved_at`
- **Payout:** `payout_method` ('bank_transfer', 'upi'), `payout_reference`, `payout_completed_at`

---

### 17. **vendor_commission_settings** - Commission Configuration
Per-vendor commission and payment settings.

**Key Fields:**
- `id` (UUID, PK)
- `vendor_id` (FK → vendors, UNIQUE)
- `commission_percentage` (default 15%)
- `custom_commission_reason`
- **Cancellation:** `cancellation_window_hours`, `cancellation_refund_percentage`
- **Payment:** `settlement_cycle` ('daily', 'weekly', 'biweekly', 'monthly'), `minimum_payout_amount`
- **Bank:** `bank_details_verified`, `bank_verification_date`

---

### 18. **admin_roles** - Admin Permissions
Admin user roles and permissions.

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (FK → auth.users, UNIQUE)
- `role` ('super_admin', 'operations', 'finance', 'support')
- `permissions` (JSONB)
- `created_by`, `created_at`

---

### 19. **admin_actions_log** - Audit Trail
Logs all admin actions for audit purposes.

**Key Fields:**
- `id` (UUID, PK)
- `admin_id` (FK → auth.users)
- `action`, `entity_type`, `entity_id`
- `notes`
- `created_at`

---

## Key Relationships

```
auth.users (Supabase)
  ├─→ users (profile extension)
  ├─→ vendors (vendor profiles)
  ├─→ bookings (as customer)
  ├─→ reviews (as customer)
  └─→ admin_roles (admin permissions)

vendors
  ├─→ vendor_activities (activities offered)
  ├─→ vendor_documents (KYC & licenses)
  ├─→ activity_listings (created listings)
  ├─→ bookings (received bookings)
  ├─→ settlements (payouts)
  └─→ vendor_commission_settings (payment terms)

activity_listings
  ├─→ activity_pricing (pricing rules)
  ├─→ activity_schedules (availability)
  ├─→ activity_time_slots (time slots)
  ├─→ activity_availability (overrides)
  ├─→ listing_daily_capacity (capacity tracking)
  └─→ bookings (customer bookings)

bookings
  ├─→ booking_participants (participant details)
  ├─→ booking_waivers_signed (signed waivers)
  ├─→ payments (payment transactions)
  ├─→ reviews (customer reviews)
  └─→ settlements (vendor payouts)
```

---

## Security (RLS Policies)

All tables have Row Level Security (RLS) enabled with policies for:
- **Vendors**: Can view/update own data only
- **Customers**: Can view/update own bookings/reviews
- **Admins**: Can view/update all data via `is_admin()` function

---

## Important Functions

### Helper Functions
- `is_admin()` - Check if current user is admin
- `is_vendor()` - Check if current user is vendor
- `get_vendor_id()` - Get vendor_id for current user
- `update_updated_at()` - Auto-update updated_at timestamp

### Business Logic Functions
- `enforce_vendor_onboarding_rate_limit()` - Max 3 vendor registrations/hour
- `enforce_vendor_document_limit()` - Max 12 files per vendor
- `auto_expire_documents()` - Auto-expire documents past expiry_date
- `check_capacity_before_booking()` - Prevent overbooking
- `enforce_booking_rate_limit()` - Max 10 bookings/day/customer
- `create_settlement_on_payment_success()` - Auto-create settlement on payment
- `auto_confirm_booking_on_payment()` - Auto-confirm booking on payment

---

## Timestamps

All tables include:
- `created_at` - Record creation time
- `updated_at` - Last update time (auto-updated via trigger)

---

## Status Enums

### Vendor Status
- `pending` - Awaiting approval
- `approved` - Approved by admin
- `rejected` - Rejected by admin
- `suspended` - Suspended by super admin

### Listing Status
- `draft` - Not submitted
- `pending` - Awaiting approval
- `approved` - Approved but not published
- `active` - Published and bookable
- `inactive` - Unpublished
- `suspended` - Suspended by admin

### Booking Status
- `pending` - Awaiting payment
- `confirmed` - Payment successful
- `cancelled_by_customer` - Customer cancelled
- `cancelled_by_vendor` - Vendor cancelled
- `completed` - Activity completed
- `refunded` - Refund processed
- `no_show` - Customer didn't show up

### Payment Status
- `pending` - Awaiting payment
- `processing` - Payment in progress
- `success` - Payment successful
- `failed` - Payment failed
- `refund_pending` - Refund initiated
- `refunded` - Refund completed

### Settlement Status
- `pending_settlement` - Awaiting eligibility
- `ready_for_review` - Eligible, needs review
- `approved` - Approved for payout
- `processing` - Payout in progress
- `completed` - Payout completed
- `failed` - Payout failed
- `on_hold` - Temporarily on hold
- `cancelled` - Settlement cancelled

---

## Storage Buckets

### vendor-documents
- **Type**: Private
- **Max File Size**: 1MB
- **Allowed Types**: image/jpeg, image/png
- **Structure**: `{user_id}/{filename}`
- **RLS**: Users can only access own folder

---

This schema is production-ready and fully implemented in Supabase.
