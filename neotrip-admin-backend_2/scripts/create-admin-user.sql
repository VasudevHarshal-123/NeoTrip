-- =====================================================
-- NEOTRIP ADMIN USER SETUP
-- =====================================================
-- This script creates the first admin user for the admin dashboard
-- Run this AFTER creating a user via Supabase Authentication
-- =====================================================

-- STEP 1: Create user via Supabase Dashboard first
-- =====================================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Email: admin@neotrip.com (or your preferred email)
-- 4. Password: Create a strong password
-- 5. Confirm Email: Toggle ON (so user is immediately verified)
-- 6. Click "Create user"
-- 7. Copy the User ID (UUID) from the users list
-- =====================================================

-- STEP 2: Run this SQL to grant admin privileges
-- =====================================================
-- Replace 'YOUR_USER_EMAIL_HERE' with the actual email

-- Update user type to admin
UPDATE public.users 
SET user_type = 'admin',
    is_verified = TRUE,
    email_verified = TRUE
WHERE email = 'admin@neotrip.com';  -- CHANGE THIS EMAIL

-- Verify the update
SELECT id, email, user_type, is_verified 
FROM public.users 
WHERE email = 'admin@neotrip.com';  -- CHANGE THIS EMAIL

-- =====================================================
-- STEP 3: Create admin role with super_admin privileges
-- =====================================================

INSERT INTO public.admin_roles (user_id, role, permissions, created_by)
SELECT 
  id,
  'super_admin',
  '{
    "vendors": true,
    "bookings": true,
    "settlements": true,
    "users": true,
    "reports": true,
    "analytics": true,
    "system": true
  }'::jsonb,
  id  -- self-created
FROM public.users
WHERE email = 'admin@neotrip.com'  -- CHANGE THIS EMAIL
ON CONFLICT (user_id) DO UPDATE
SET 
  role = 'super_admin',
  permissions = '{
    "vendors": true,
    "bookings": true,
    "settlements": true,
    "users": true,
    "reports": true,
    "analytics": true,
    "system": true
  }'::jsonb;

-- =====================================================
-- STEP 4: Verify admin user setup
-- =====================================================

SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  u.user_type,
  u.is_verified,
  u.email_verified,
  ar.role AS admin_role,
  ar.permissions,
  ar.created_at AS admin_since
FROM public.users u
LEFT JOIN public.admin_roles ar ON ar.user_id = u.id
WHERE u.email = 'admin@neotrip.com';  -- CHANGE THIS EMAIL

-- Expected output:
-- ✅ user_type = 'admin'
-- ✅ admin_role = 'super_admin'
-- ✅ permissions = {"vendors": true, "bookings": true, ...}

-- =====================================================
-- OPTIONAL: Create additional admin users
-- =====================================================

-- Finance Admin (for settlements only)
/*
INSERT INTO public.admin_roles (user_id, role, permissions, created_by)
SELECT 
  id,
  'finance',
  '{
    "settlements": true,
    "reports": true
  }'::jsonb,
  (SELECT id FROM public.users WHERE email = 'admin@neotrip.com' LIMIT 1)
FROM public.users
WHERE email = 'finance@neotrip.com';  -- Email of finance admin

UPDATE public.users 
SET user_type = 'admin'
WHERE email = 'finance@neotrip.com';
*/

-- Operations Admin (for vendors and bookings)
/*
INSERT INTO public.admin_roles (user_id, role, permissions, created_by)
SELECT 
  id,
  'operations',
  '{
    "vendors": true,
    "bookings": true,
    "reports": true
  }'::jsonb,
  (SELECT id FROM public.users WHERE email = 'admin@neotrip.com' LIMIT 1)
FROM public.users
WHERE email = 'operations@neotrip.com';  -- Email of operations admin

UPDATE public.users 
SET user_type = 'admin'
WHERE email = 'operations@neotrip.com';
*/

-- Support Admin (read-only)
/*
INSERT INTO public.admin_roles (user_id, role, permissions, created_by)
SELECT 
  id,
  'support',
  '{
    "vendors": false,
    "bookings": false,
    "settlements": false,
    "reports": true
  }'::jsonb,
  (SELECT id FROM public.users WHERE email = 'admin@neotrip.com' LIMIT 1)
FROM public.users
WHERE email = 'support@neotrip.com';  -- Email of support admin

UPDATE public.users 
SET user_type = 'admin'
WHERE email = 'support@neotrip.com';
*/

-- =====================================================
-- TESTING
-- =====================================================
-- After running this script:
-- 1. Try logging in with the admin credentials in the admin dashboard
-- 2. The backend API will verify the user_type = 'admin'
-- 3. Check that you can access protected admin endpoints
-- =====================================================

-- =====================================================
-- SECURITY NOTES
-- =====================================================
-- ⚠️  IMPORTANT: 
-- 1. Change default admin email before production
-- 2. Use strong, unique passwords for all admin accounts
-- 3. Never commit admin credentials to version control
-- 4. Regularly rotate admin passwords
-- 5. Monitor admin_actions_log table for suspicious activity
-- 6. Disable unused admin accounts
-- =====================================================
