## 📝 Implementation Steps

### **Step 1: Execute SQL**
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire COMPLETE_DATABASE_SCHEMA.sql
4. Execute
5. ✅ Done!
```

### **Step 2: Create Storage Bucket**
```bash
1. Go to Storage → Create bucket
2. Name: "vendor-documents"
3. Private: YES
4. File size limit: 1 MB
5. Allowed types: image/jpeg, image/png
```

### **Step 3: Set Storage RLS Policies**
```sql
-- Execute these in SQL Editor
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vendor-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is a vendor
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.vendors
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get vendor_id for current authenticated user
CREATE OR REPLACE FUNCTION public.get_vendor_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.vendors
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- =====================================================
-- PART 1: VENDOR ONBOARDING
-- =====================================================
-- =====================================================
-- Tables: users, vendors, vendor_onboarding_rate_limit,
--         activities_master, activity_license_requirements,
--         vendor_activities, vendor_documents
-- =====================================================


-- =====================================================
-- TABLE 1: USERS
-- =====================================================
-- Purpose: Extends Supabase auth.users with profile information
-- Contains: Customer, Vendor, and Admin user profiles
-- Access: Users can read/update own profile, Admins can read all
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile Information
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- User Classification
  user_type TEXT NOT NULL DEFAULT 'customer' CHECK (user_type IN ('customer', 'vendor', 'admin')),
  
  -- Preferences
  preferred_language TEXT DEFAULT 'en',
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  
  -- Address (Optional)
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  
  -- Statistics
  total_bookings INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Account Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_users_user_type ON public.users(user_type);
CREATE INDEX idx_users_email_verified ON public.users(email_verified);
CREATE INDEX idx_users_location ON public.users(city, state);
CREATE INDEX idx_users_is_active ON public.users(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND user_type = (SELECT user_type FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- Trigger: Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email_verified)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Update updated_at
CREATE TRIGGER set_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 2: VENDORS
-- =====================================================
-- Purpose: Stores vendor/operator business information
-- Contains: Vendor profile, approval status, onboarding progress, bank details
-- Access: Vendors can view/update own, Admins can approve/reject
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Business Information
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  company_name TEXT,
  
  -- Bank Details (for settlements)
  bank_account_holder_name TEXT,
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  upi_id TEXT,
  gstin TEXT, -- GST number
  pan_number TEXT,
  
  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  approval_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Onboarding Progress
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1 CHECK (onboarding_step >= 1 AND onboarding_step <= 10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendors_email ON public.vendors(email);
CREATE INDEX idx_vendors_status ON public.vendors(status);
CREATE INDEX idx_vendors_approved ON public.vendors(status, approved_at) WHERE status = 'approved';

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors can view own profile"
  ON public.vendors FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Vendors can update own profile (except status)"
  ON public.vendors FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND status = (SELECT status FROM public.vendors WHERE id = vendors.id)
    AND approved_at = (SELECT approved_at FROM public.vendors WHERE id = vendors.id)
  );

CREATE POLICY "Users can create vendor profile once"
  ON public.vendors FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all vendors"
  ON public.vendors FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all vendors"
  ON public.vendors FOR UPDATE
  USING (public.is_admin());

-- Trigger: Update updated_at
CREATE TRIGGER set_vendors_updated_at 
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 3: VENDOR_ONBOARDING_RATE_LIMIT
-- =====================================================
-- Purpose: Rate limit vendor registrations (max 3 per hour globally)
-- Contains: Tracking of vendor registration attempts
-- Access: System-managed (no direct user access)
-- Security: Prevents database attacks via mass vendor signups
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_onboarding_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_created ON public.vendor_onboarding_rate_limit(created_at);

-- Enable RLS (no policies = no direct access)
ALTER TABLE public.vendor_onboarding_rate_limit ENABLE ROW LEVEL SECURITY;

-- Function: Enforce rate limit (max 3 vendors per hour)
CREATE OR REPLACE FUNCTION public.enforce_vendor_onboarding_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  onboardings_last_hour INTEGER;
BEGIN
  SELECT COUNT(*) INTO onboardings_last_hour
  FROM public.vendor_onboarding_rate_limit
  WHERE created_at >= NOW() - INTERVAL '1 hour';
  
  IF onboardings_last_hour >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 3 vendor registrations per hour. Please try again later.';
  END IF;
  
  INSERT INTO public.vendor_onboarding_rate_limit (user_id)
  VALUES (NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_vendor_onboarding_rate_limit
  BEFORE INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_vendor_onboarding_rate_limit();

-- Function: Cleanup old rate limit records (call via cron daily)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_records()
RETURNS void AS $$
BEGIN
  DELETE FROM public.vendor_onboarding_rate_limit
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- TABLE 4: ACTIVITIES_MASTER
-- =====================================================
-- Purpose: Master list of all possible adventure activities
-- Contains: Activity name, category, age restrictions, license requirements
-- Access: Public read, Admin-only write
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activities_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Activity Details
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('air', 'water', 'land', 'snow', 'wildlife')),
  description TEXT,
  
  -- Age Restrictions (default for this activity type)
  default_min_age INTEGER CHECK (default_min_age >= 0 AND default_min_age <= 100),
  default_max_age INTEGER CHECK (default_max_age >= default_min_age AND default_max_age <= 150),
  
  -- License Requirements
  requires_license BOOLEAN DEFAULT TRUE,
  license_description TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activities_master_slug ON public.activities_master(slug);
CREATE INDEX idx_activities_master_category ON public.activities_master(category);
CREATE INDEX idx_activities_master_active ON public.activities_master(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.activities_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active activities"
  ON public.activities_master FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Only admins can insert activities"
  ON public.activities_master FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update activities"
  ON public.activities_master FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete activities"
  ON public.activities_master FOR DELETE
  USING (public.is_admin());

-- Trigger: Update updated_at
CREATE TRIGGER set_activities_master_updated_at 
  BEFORE UPDATE ON public.activities_master
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 5: ACTIVITY_LICENSE_REQUIREMENTS
-- =====================================================
-- Purpose: Defines specific certificates needed for each activity
-- Contains: Certificate name, issuing authority, mandatory status
-- Access: Public read, Admin-only write
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_license_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities_master(id) ON DELETE CASCADE NOT NULL,
  
  -- Certificate Details
  certificate_name TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT TRUE,
  issuing_authority TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_license_req_activity ON public.activity_license_requirements(activity_id);
CREATE INDEX idx_license_req_display_order ON public.activity_license_requirements(activity_id, display_order);

-- Enable RLS
ALTER TABLE public.activity_license_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view license requirements"
  ON public.activity_license_requirements FOR SELECT
  USING (TRUE);

CREATE POLICY "Only admins can manage license requirements"
  ON public.activity_license_requirements FOR ALL
  USING (public.is_admin());


-- =====================================================
-- TABLE 6: VENDOR_ACTIVITIES
-- =====================================================
-- Purpose: Junction table linking vendors to activities they offer
-- Contains: Vendor-activity relationship, approval status
-- Access: Vendors can add/view own, Admins can approve
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.activities_master(id) ON DELETE CASCADE NOT NULL,
  
  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vendor_id, activity_id)
);

-- Indexes
CREATE INDEX idx_vendor_activities_vendor ON public.vendor_activities(vendor_id);
CREATE INDEX idx_vendor_activities_activity ON public.vendor_activities(activity_id);
CREATE INDEX idx_vendor_activities_status ON public.vendor_activities(status);
CREATE INDEX idx_vendor_activities_approved ON public.vendor_activities(vendor_id, status) WHERE status = 'approved';

-- Enable RLS
ALTER TABLE public.vendor_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors can view own activities"
  ON public.vendor_activities FOR SELECT
  USING (vendor_id = public.get_vendor_id() OR public.is_admin());

CREATE POLICY "Vendors can add activities"
  ON public.vendor_activities FOR INSERT
  WITH CHECK (vendor_id = public.get_vendor_id());

CREATE POLICY "Vendors can update own activities (except status)"
  ON public.vendor_activities FOR UPDATE
  USING (vendor_id = public.get_vendor_id())
  WITH CHECK (
    vendor_id = public.get_vendor_id()
    AND status = (SELECT status FROM public.vendor_activities WHERE id = vendor_activities.id)
  );

CREATE POLICY "Admins can manage all vendor activities"
  ON public.vendor_activities FOR ALL
  USING (public.is_admin());

-- Trigger: Update updated_at
CREATE TRIGGER set_vendor_activities_updated_at 
  BEFORE UPDATE ON public.vendor_activities
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 7: VENDOR_DOCUMENTS
-- =====================================================
-- Purpose: Stores vendor KYC documents and activity licenses
-- Contains: Document files, expiry dates, approval status
-- Access: Vendors upload own, Admins approve
-- Security: Max 12 files per vendor, 1MB max file size
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  vendor_activity_id UUID REFERENCES public.vendor_activities(id) ON DELETE CASCADE,
  activity_license_requirement_id UUID REFERENCES public.activity_license_requirements(id),
  
  -- Document Classification
  document_category TEXT NOT NULL CHECK (document_category IN ('vendor_kyc', 'activity_license')),
  document_type TEXT,
  custom_document_name TEXT,
  
  -- File Details
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 1048576),
  file_type TEXT,
  
  -- Certificate Expiry Tracking
  has_expiry BOOLEAN DEFAULT FALSE,
  expiry_date DATE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approval_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendor_docs_vendor ON public.vendor_documents(vendor_id);
CREATE INDEX idx_vendor_docs_activity ON public.vendor_documents(vendor_activity_id);
CREATE INDEX idx_vendor_docs_expiry ON public.vendor_documents(expiry_date) WHERE has_expiry = TRUE;
CREATE INDEX idx_vendor_docs_status ON public.vendor_documents(status);

-- Enable RLS
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors can view own documents"
  ON public.vendor_documents FOR SELECT
  USING (vendor_id = public.get_vendor_id() OR public.is_admin());

CREATE POLICY "Vendors can upload documents"
  ON public.vendor_documents FOR INSERT
  WITH CHECK (vendor_id = public.get_vendor_id());

CREATE POLICY "Vendors can delete pending documents"
  ON public.vendor_documents FOR DELETE
  USING (vendor_id = public.get_vendor_id() AND status = 'pending');

CREATE POLICY "Admins can manage all documents"
  ON public.vendor_documents FOR ALL
  USING (public.is_admin());

-- Trigger: Enforce 12 file limit per vendor
CREATE OR REPLACE FUNCTION public.enforce_vendor_document_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF NEW.file_size > 1048576 THEN
    RAISE EXCEPTION 'File size exceeds 1 MB limit';
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.vendor_documents
  WHERE vendor_id = NEW.vendor_id;
  
  IF current_count >= 12 THEN
    RAISE EXCEPTION 'Maximum 12 files per vendor';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_vendor_document_limit
  BEFORE INSERT ON public.vendor_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_vendor_document_limit();

-- Trigger: Auto-expire documents
CREATE OR REPLACE FUNCTION public.auto_expire_documents()
RETURNS void AS $$
BEGIN
  UPDATE public.vendor_documents
  SET status = 'expired', updated_at = NOW()
  WHERE has_expiry = TRUE
    AND expiry_date < CURRENT_DATE
    AND status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update updated_at
CREATE TRIGGER set_vendor_documents_updated_at 
  BEFORE UPDATE ON public.vendor_documents
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();



-- =====================================================
-- PART 2: ACTIVITY LISTING & MANAGEMENT
-- =====================================================
-- Execute this AFTER Part 1 is complete
-- Includes helper functions if missing
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS (Re-create to ensure they exist)
-- =====================================================

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is a vendor
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.vendors
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get vendor_id for current authenticated user
CREATE OR REPLACE FUNCTION public.get_vendor_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.vendors
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- TABLE 8: ACTIVITY_LISTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_activity_id UUID REFERENCES public.vendor_activities(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.activities_master(id) ON DELETE CASCADE NOT NULL,
  
  -- Listing Details
  title TEXT NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 50),
  duration_type TEXT NOT NULL CHECK (duration_type IN ('slot', 'single_day', 'multi_day')),
  duration_value INTEGER CHECK (duration_value > 0 AND duration_value <= 365),
  duration_unit TEXT CHECK (duration_unit IN ('hours', 'days')),
  
  -- Age Restrictions
  min_age INTEGER CHECK (min_age >= 0 AND min_age <= 100),
  max_age INTEGER CHECK (max_age >= min_age AND max_age <= 150),
  
  -- Inclusions/Exclusions
  inclusions JSONB,
  exclusions JSONB,
  requirements JSONB,
  
  -- Media (max 10 images)
  images JSONB,
  
  -- Location
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  pickup_points JSONB,
  
  -- Capacity
  min_participants INTEGER DEFAULT 1 CHECK (min_participants >= 1),
  max_participants_per_slot INTEGER CHECK (max_participants_per_slot >= min_participants),
  max_participants_per_day INTEGER CHECK (max_participants_per_day >= max_participants_per_slot),
  
  -- Equipment Limitations
  equipment_limited BOOLEAN DEFAULT FALSE,
  equipment_count INTEGER CHECK (equipment_count > 0),
  
  -- Status & Approval
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'active', 'inactive', 'suspended')),
  is_published BOOLEAN DEFAULT FALSE,
  approval_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (WITHOUT function predicates to avoid IMMUTABLE error)
CREATE INDEX IF NOT EXISTS idx_listings_vendor ON public.activity_listings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_listings_activity ON public.activity_listings(activity_id);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.activity_listings(city, state);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.activity_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_published ON public.activity_listings(is_published, status);
CREATE INDEX IF NOT EXISTS idx_listings_search ON public.activity_listings USING gin(to_tsvector('english', title || ' ' || description));

-- Enable RLS
ALTER TABLE public.activity_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can view own listings" ON public.activity_listings;
CREATE POLICY "Vendors can view own listings"
  ON public.activity_listings FOR SELECT
  USING (vendor_id = public.get_vendor_id() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can view published listings" ON public.activity_listings;
CREATE POLICY "Customers can view published listings"
  ON public.activity_listings FOR SELECT
  USING (status = 'approved' AND is_published = TRUE);

DROP POLICY IF EXISTS "Vendors can create listings" ON public.activity_listings;
CREATE POLICY "Vendors can create listings"
  ON public.activity_listings FOR INSERT
  WITH CHECK (vendor_id = public.get_vendor_id());

DROP POLICY IF EXISTS "Vendors can update own listings" ON public.activity_listings;
CREATE POLICY "Vendors can update own listings"
  ON public.activity_listings FOR UPDATE
  USING (vendor_id = public.get_vendor_id())
  WITH CHECK (
    vendor_id = public.get_vendor_id()
    AND status = (SELECT status FROM public.activity_listings WHERE id = activity_listings.id)
  );

DROP POLICY IF EXISTS "Vendors can delete draft listings" ON public.activity_listings;
CREATE POLICY "Vendors can delete draft listings"
  ON public.activity_listings FOR DELETE
  USING (vendor_id = public.get_vendor_id() AND status = 'draft');

DROP POLICY IF EXISTS "Admins can manage all listings" ON public.activity_listings;
CREATE POLICY "Admins can manage all listings"
  ON public.activity_listings FOR ALL
  USING (public.is_admin());

-- Trigger: Validate images
CREATE OR REPLACE FUNCTION validate_listing_images()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.images IS NOT NULL THEN
    -- Check image count
    IF jsonb_array_length(NEW.images) > 10 THEN
      RAISE EXCEPTION 'Maximum 10 images allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_images_on_listing ON public.activity_listings;
CREATE TRIGGER validate_images_on_listing
  BEFORE INSERT OR UPDATE ON public.activity_listings
  FOR EACH ROW
  EXECUTE FUNCTION validate_listing_images();

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_activity_listings_updated_at ON public.activity_listings;
CREATE TRIGGER set_activity_listings_updated_at 
  BEFORE UPDATE ON public.activity_listings
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 9: ACTIVITY_PRICING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE CASCADE NOT NULL,
  
  -- Base Pricing
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  currency TEXT DEFAULT 'INR',
  
  -- Dynamic Pricing
  weekend_multiplier DECIMAL(3, 2) DEFAULT 1.0 CHECK (weekend_multiplier >= 0.5 AND weekend_multiplier <= 5.0),
  peak_season_multiplier DECIMAL(3, 2) DEFAULT 1.0 CHECK (peak_season_multiplier >= 0.5 AND peak_season_multiplier <= 5.0),
  festival_surcharge DECIMAL(10, 2) DEFAULT 0 CHECK (festival_surcharge >= 0),
  
  -- Season Configuration
  season_type TEXT CHECK (season_type IN ('regular', 'peak', 'off')),
  season_start_date DATE,
  season_end_date DATE,
  
  -- Group Discounts
  group_size_threshold INTEGER CHECK (group_size_threshold >= 2),
  group_discount_percent DECIMAL(5, 2) CHECK (group_discount_percent >= 0 AND group_discount_percent <= 100),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (season_end_date IS NULL OR season_end_date >= season_start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_listing ON public.activity_pricing(listing_id);
CREATE INDEX IF NOT EXISTS idx_pricing_season ON public.activity_pricing(season_start_date, season_end_date);
CREATE INDEX IF NOT EXISTS idx_pricing_active ON public.activity_pricing(listing_id, is_active);

-- Enable RLS
ALTER TABLE public.activity_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can manage own pricing" ON public.activity_pricing;
CREATE POLICY "Vendors can manage own pricing"
  ON public.activity_pricing FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE vendor_id = public.get_vendor_id()
    )
  );

DROP POLICY IF EXISTS "Customers can view published pricing" ON public.activity_pricing;
CREATE POLICY "Customers can view published pricing"
  ON public.activity_pricing FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE status = 'approved' AND is_published = TRUE
    )
  );

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_activity_pricing_updated_at ON public.activity_pricing;
CREATE TRIGGER set_activity_pricing_updated_at 
  BEFORE UPDATE ON public.activity_pricing
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 10: ACTIVITY_SCHEDULES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE CASCADE NOT NULL,
  
  -- Schedule Configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'specific_dates', 'date_range')),
  days_of_week JSONB,
  dates_of_month JSONB,
  specific_dates JSONB,
  start_date DATE,
  end_date DATE,
  has_time_slots BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_listing ON public.activity_schedules(listing_id);
CREATE INDEX IF NOT EXISTS idx_schedules_dates ON public.activity_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON public.activity_schedules(listing_id, is_active);

-- Enable RLS
ALTER TABLE public.activity_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can manage own schedules" ON public.activity_schedules;
CREATE POLICY "Vendors can manage own schedules"
  ON public.activity_schedules FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE vendor_id = public.get_vendor_id()
    )
  );

DROP POLICY IF EXISTS "Customers can view published schedules" ON public.activity_schedules;
CREATE POLICY "Customers can view published schedules"
  ON public.activity_schedules FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE status = 'approved' AND is_published = TRUE
    )
  );

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_activity_schedules_updated_at ON public.activity_schedules;
CREATE TRIGGER set_activity_schedules_updated_at 
  BEFORE UPDATE ON public.activity_schedules
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 11: ACTIVITY_TIME_SLOTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.activity_schedules(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE CASCADE NOT NULL,
  
  -- Slot Configuration
  slot_name TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),
  
  -- Capacity
  max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
  
  -- Optional Price Override
  price_override DECIMAL(10, 2) CHECK (price_override >= 0),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_slots_schedule ON public.activity_time_slots(schedule_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_listing ON public.activity_time_slots(listing_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_active ON public.activity_time_slots(listing_id, is_active);

-- Enable RLS
ALTER TABLE public.activity_time_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can manage own time slots" ON public.activity_time_slots;
CREATE POLICY "Vendors can manage own time slots"
  ON public.activity_time_slots FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE vendor_id = public.get_vendor_id()
    )
  );

DROP POLICY IF EXISTS "Customers can view published time slots" ON public.activity_time_slots;
CREATE POLICY "Customers can view published time slots"
  ON public.activity_time_slots FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE status = 'approved' AND is_published = TRUE
    )
  );


-- =====================================================
-- TABLE 12: ACTIVITY_AVAILABILITY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE CASCADE NOT NULL,
  time_slot_id UUID REFERENCES public.activity_time_slots(id) ON DELETE CASCADE,
  
  -- Date Configuration
  availability_date DATE NOT NULL,
  
  -- Override Type
  override_type TEXT NOT NULL CHECK (override_type IN ('unavailable', 'custom_capacity', 'custom_price')),
  
  -- Custom Capacity
  custom_capacity INTEGER CHECK (custom_capacity >= 0),
  offline_bookings INTEGER DEFAULT 0 CHECK (offline_bookings >= 0),
  
  -- Custom Price
  custom_price DECIMAL(10, 2) CHECK (custom_price >= 0),
  
  -- Reason
  reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(listing_id, availability_date, time_slot_id),
  CHECK (
    (override_type = 'unavailable' AND reason IS NOT NULL) OR
    (override_type = 'custom_capacity' AND custom_capacity IS NOT NULL) OR
    (override_type = 'custom_price' AND custom_price IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_listing ON public.activity_availability(listing_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON public.activity_availability(availability_date);
CREATE INDEX IF NOT EXISTS idx_availability_slot ON public.activity_availability(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_availability_future ON public.activity_availability(listing_id, availability_date);

-- Enable RLS
ALTER TABLE public.activity_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can manage own availability" ON public.activity_availability;
CREATE POLICY "Vendors can manage own availability"
  ON public.activity_availability FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE vendor_id = public.get_vendor_id()
    )
  );

DROP POLICY IF EXISTS "Customers can view published availability" ON public.activity_availability;
CREATE POLICY "Customers can view published availability"
  ON public.activity_availability FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE status = 'approved' AND is_published = TRUE
    )
  );

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_activity_availability_updated_at ON public.activity_availability;
CREATE TRIGGER set_activity_availability_updated_at 
  BEFORE UPDATE ON public.activity_availability
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 13: ACTIVITY_WAIVERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE CASCADE NOT NULL,
  
  -- Waiver Content
  waiver_title TEXT NOT NULL,
  waiver_content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  
  -- Requirements
  requires_signature BOOLEAN DEFAULT TRUE,
  requires_witness BOOLEAN DEFAULT FALSE,
  requires_parent_consent BOOLEAN DEFAULT FALSE,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waivers_listing ON public.activity_waivers(listing_id);
CREATE INDEX IF NOT EXISTS idx_waivers_active ON public.activity_waivers(is_active);

-- Enable RLS
ALTER TABLE public.activity_waivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can manage own waivers" ON public.activity_waivers;
CREATE POLICY "Vendors can manage own waivers"
  ON public.activity_waivers FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE vendor_id = public.get_vendor_id()
    )
  );

DROP POLICY IF EXISTS "Customers can view published waivers" ON public.activity_waivers;
CREATE POLICY "Customers can view published waivers"
  ON public.activity_waivers FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE status = 'approved' AND is_published = TRUE
    )
  );


-- =====================================================
-- PART 2 COMPLETE
-- =====================================================
-- Created 6 tables:
-- 1. activity_listings
-- 2. activity_pricing
-- 3. activity_schedules
-- 4. activity_time_slots
-- 5. activity_availability
-- 6. activity_waivers
-- 
-- Next: Execute Part 3 (Bookings & Payments)
-- =====================================================

-- =====================================================
-- PART 3: USER BOOKING & INTERACTIONS (FINAL - ALL ERRORS FIXED)
-- =====================================================
-- Execute this AFTER Part 2 is complete
-- All syntax errors, IMMUTABLE errors, and reserved word conflicts fixed
-- =====================================================

-- =====================================================
-- TABLE 14: LISTING_DAILY_CAPACITY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.listing_daily_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE CASCADE NOT NULL,
  time_slot_id UUID REFERENCES public.activity_time_slots(id),
  availability_date DATE NOT NULL,
  
  -- Capacity Tracking (available_capacity is IMMUTABLE - uses only arithmetic)
  total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
  booked_count INTEGER DEFAULT 0 CHECK (booked_count >= 0),
  offline_bookings INTEGER DEFAULT 0 CHECK (offline_bookings >= 0),
  available_capacity INTEGER GENERATED ALWAYS AS (
    total_capacity - booked_count - offline_bookings
  ) STORED,
  
  -- Locking
  booking_in_progress INTEGER DEFAULT 0,
  last_booking_attempt_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(listing_id, availability_date, time_slot_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_capacity_listing ON public.listing_daily_capacity(listing_id);
CREATE INDEX IF NOT EXISTS idx_daily_capacity_date ON public.listing_daily_capacity(availability_date);
CREATE INDEX IF NOT EXISTS idx_daily_capacity_future ON public.listing_daily_capacity(availability_date);

-- Enable RLS
ALTER TABLE public.listing_daily_capacity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can manage own capacity" ON public.listing_daily_capacity;
CREATE POLICY "Vendors can manage own capacity"
  ON public.listing_daily_capacity FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE vendor_id = public.get_vendor_id()
    )
  );

DROP POLICY IF EXISTS "Customers can view published capacity" ON public.listing_daily_capacity;
CREATE POLICY "Customers can view published capacity"
  ON public.listing_daily_capacity FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.activity_listings
      WHERE status = 'approved' AND is_published = TRUE
    )
  );


-- =====================================================
-- TABLE 15: BOOKINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE RESTRICT NOT NULL,
  time_slot_id UUID REFERENCES public.activity_time_slots(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) NOT NULL,
  
  -- Booking Details
  booking_date DATE NOT NULL,
  number_of_participants INTEGER NOT NULL CHECK (number_of_participants > 0),
  
  -- Multi-day Tracking
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  
  -- Pricing Snapshot
  base_price_per_person DECIMAL(10, 2) NOT NULL CHECK (base_price_per_person >= 0),
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  final_amount DECIMAL(10, 2) NOT NULL CHECK (final_amount >= 0),
  
  -- Cancellation Policy (removed GENERATED - NOW() is not immutable)
  cancellation_deadline TIMESTAMP WITH TIME ZONE,
  cancellation_window_hours INTEGER DEFAULT 48 CHECK (cancellation_window_hours >= 0),
  
  -- Force Majeure (weather/emergency cancellations)
  force_majeure_cancellation BOOLEAN DEFAULT FALSE,
  
  -- Payment Expiry (15 minutes)
  payment_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Status Management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'confirmed',
    'cancelled_by_customer',
    'cancelled_by_vendor',
    'completed',
    'refunded',
    'no_show'
  )),
  cancellation_reason TEXT,
  refund_amount DECIMAL(10, 2) CHECK (refund_amount >= 0 AND refund_amount <= final_amount),
  refund_status TEXT CHECK (refund_status IN ('pending', 'processed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON public.bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor ON public.bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_upcoming ON public.bookings(customer_id, start_date);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.bookings;
CREATE POLICY "Customers can view own bookings"
  ON public.bookings FOR SELECT
  USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Vendors can view own activity bookings" ON public.bookings;
CREATE POLICY "Vendors can view own activity bookings"
  ON public.bookings FOR SELECT
  USING (vendor_id = public.get_vendor_id() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can cancel own bookings" ON public.bookings;
CREATE POLICY "Customers can cancel own bookings"
  ON public.bookings FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'cancelled_by_customer'
  );

DROP POLICY IF EXISTS "Vendors can update own activity bookings" ON public.bookings;
CREATE POLICY "Vendors can update own activity bookings"
  ON public.bookings FOR UPDATE
  USING (vendor_id = public.get_vendor_id())
  WITH CHECK (
    vendor_id = public.get_vendor_id()
    AND status IN ('completed', 'cancelled_by_vendor', 'no_show')
  );

DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings"
  ON public.bookings FOR ALL
  USING (public.is_admin());

-- Trigger: Set payment expiry (15 minutes)
CREATE OR REPLACE FUNCTION set_payment_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    NEW.payment_expires_at := NOW() + INTERVAL '15 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_payment_expiry ON public.bookings;
CREATE TRIGGER set_booking_payment_expiry
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_expiry();

-- Trigger: Handle force majeure cancellation
CREATE OR REPLACE FUNCTION handle_force_majeure_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled_by_vendor' AND NEW.force_majeure_cancellation = TRUE THEN
    NEW.refund_amount := NEW.final_amount;
    NEW.refund_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_force_majeure ON public.bookings;
CREATE TRIGGER process_force_majeure
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_force_majeure_cancellation();

-- Trigger: Prevent overbooking (FIXED: renamed current_date to v_current_date)
CREATE OR REPLACE FUNCTION check_capacity_before_booking()
RETURNS TRIGGER AS $$
DECLARE
  available INTEGER;
  v_current_date DATE;
BEGIN
  -- Check capacity for each day in multi-day booking
  v_current_date := NEW.start_date;
  
  WHILE v_current_date <= NEW.end_date LOOP
    -- Lock row and check capacity
    SELECT available_capacity INTO available
    FROM public.listing_daily_capacity
    WHERE listing_id = NEW.listing_id
      AND availability_date = v_current_date
      AND (time_slot_id = NEW.time_slot_id OR (time_slot_id IS NULL AND NEW.time_slot_id IS NULL))
    FOR UPDATE;
    
    IF available IS NULL OR available < NEW.number_of_participants THEN
      RAISE EXCEPTION 'Insufficient capacity on %. Only % spots available', 
        v_current_date, COALESCE(available, 0);
    END IF;
    
    -- Reserve capacity
    UPDATE public.listing_daily_capacity
    SET booked_count = booked_count + NEW.number_of_participants
    WHERE listing_id = NEW.listing_id
      AND availability_date = v_current_date
      AND (time_slot_id = NEW.time_slot_id OR (time_slot_id IS NULL AND NEW.time_slot_id IS NULL));
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_overbooking ON public.bookings;
CREATE TRIGGER prevent_overbooking
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_capacity_before_booking();

-- Trigger: Rate limit (10 bookings/day/customer)
CREATE OR REPLACE FUNCTION enforce_booking_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  bookings_today INTEGER;
BEGIN
  SELECT COUNT(*) INTO bookings_today
  FROM public.bookings
  WHERE customer_id = NEW.customer_id
    AND created_at::DATE = CURRENT_DATE;
  
  IF bookings_today >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 bookings per day allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_booking_rate_limit ON public.bookings;
CREATE TRIGGER check_booking_rate_limit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_rate_limit();

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at 
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- Helper function: Check if booking is refundable
CREATE OR REPLACE FUNCTION public.is_booking_refundable(
  p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_cancellation_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT cancellation_deadline INTO v_cancellation_deadline
  FROM public.bookings
  WHERE id = p_booking_id;
  
  RETURN (v_cancellation_deadline IS NOT NULL AND NOW() < v_cancellation_deadline);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- FIX: SECURE THE BOOKINGS VIEW (ADD THIS)
-- =====================================================

-- Drop and recreate with security_invoker
DROP VIEW IF EXISTS public.bookings_with_refund_status;

CREATE VIEW public.bookings_with_refund_status 
WITH (security_invoker = true) AS
SELECT 
  b.*,
  (b.cancellation_deadline IS NOT NULL AND NOW() < b.cancellation_deadline) AS is_refundable
FROM public.bookings b;

COMMENT ON VIEW public.bookings_with_refund_status IS 
  'Bookings with computed refundable status - inherits RLS from bookings table';

-- =====================================================
-- TABLE 16: BOOKING_PARTICIPANTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.booking_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  
  -- Participant Info
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  
  -- Emergency Contact (CRITICAL)
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relation TEXT,
  
  -- Health/Safety
  has_health_conditions BOOLEAN DEFAULT FALSE,
  health_conditions TEXT,
  can_swim BOOLEAN,
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- ID Proof
  id_proof_type TEXT CHECK (id_proof_type IN ('aadhaar', 'pan', 'passport', 'driving_license')),
  id_proof_number TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_participants_booking ON public.booking_participants(booking_id);
CREATE INDEX IF NOT EXISTS idx_participants_age ON public.booking_participants(age);

-- Enable RLS
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can manage participants for own bookings" ON public.booking_participants;
CREATE POLICY "Customers can manage participants for own bookings"
  ON public.booking_participants FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors can view participants for own activity bookings" ON public.booking_participants;
CREATE POLICY "Vendors can view participants for own activity bookings"
  ON public.booking_participants FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE vendor_id = public.get_vendor_id()
    )
  );

DROP POLICY IF EXISTS "Admins can view all participants" ON public.booking_participants;
CREATE POLICY "Admins can view all participants"
  ON public.booking_participants FOR SELECT
  USING (public.is_admin());

-- Trigger: Validate age restrictions
CREATE OR REPLACE FUNCTION validate_participant_age()
RETURNS TRIGGER AS $$
DECLARE
  listing_min_age INTEGER;
  listing_max_age INTEGER;
BEGIN
  -- Get listing age requirements
  SELECT al.min_age, al.max_age INTO listing_min_age, listing_max_age
  FROM public.activity_listings al
  JOIN public.bookings b ON b.listing_id = al.id
  WHERE b.id = NEW.booking_id;
  
  -- Validate minimum age
  IF listing_min_age IS NOT NULL AND NEW.age < listing_min_age THEN
    RAISE EXCEPTION 'Participant must be at least % years old', listing_min_age;
  END IF;
  
  -- Validate maximum age
  IF listing_max_age IS NOT NULL AND NEW.age > listing_max_age THEN
    RAISE EXCEPTION 'Participant cannot be older than % years', listing_max_age;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_age_restrictions ON public.booking_participants;
CREATE TRIGGER validate_age_restrictions
  BEFORE INSERT ON public.booking_participants
  FOR EACH ROW
  EXECUTE FUNCTION validate_participant_age();


-- =====================================================
-- TABLE 17: BOOKING_WAIVERS_SIGNED
-- =====================================================

CREATE TABLE IF NOT EXISTS public.booking_waivers_signed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  booking_participant_id UUID REFERENCES public.booking_participants(id),
  waiver_id UUID REFERENCES public.activity_waivers(id) NOT NULL,
  
  -- Signature
  digital_signature TEXT,
  ip_address INET,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Parent/Guardian (for minors)
  guardian_name TEXT,
  guardian_signature TEXT,
  guardian_relation TEXT,
  
  UNIQUE(booking_id, waiver_id, booking_participant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waivers_signed_booking ON public.booking_waivers_signed(booking_id);
CREATE INDEX IF NOT EXISTS idx_waivers_signed_participant ON public.booking_waivers_signed(booking_participant_id);

-- Enable RLS
ALTER TABLE public.booking_waivers_signed ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can manage waivers for own bookings" ON public.booking_waivers_signed;
CREATE POLICY "Customers can manage waivers for own bookings"
  ON public.booking_waivers_signed FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors can view waivers for own bookings" ON public.booking_waivers_signed;
CREATE POLICY "Vendors can view waivers for own bookings"
  ON public.booking_waivers_signed FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE vendor_id = public.get_vendor_id()
    )
  );


-- =====================================================
-- TABLE 18: BOOKING_AMENDMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.booking_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  
  -- Amendment Type
  amendment_type TEXT NOT NULL CHECK (amendment_type IN (
    'date_change',
    'time_slot_change',
    'participant_change',
    'cancellation',
    'vendor_cancellation'
  )),
  
  -- Changes
  old_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  
  -- Financial Impact
  price_difference DECIMAL(10, 2) DEFAULT 0,
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  additional_charge DECIMAL(10, 2) DEFAULT 0,
  
  -- Approval
  requires_vendor_approval BOOLEAN DEFAULT FALSE,
  vendor_approved BOOLEAN,
  vendor_response TEXT,
  
  -- Audit
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_amendments_booking ON public.booking_amendments(booking_id);
CREATE INDEX IF NOT EXISTS idx_amendments_type ON public.booking_amendments(amendment_type);

-- Enable RLS
ALTER TABLE public.booking_amendments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can view amendments for own bookings" ON public.booking_amendments;
CREATE POLICY "Customers can view amendments for own bookings"
  ON public.booking_amendments FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE customer_id = auth.uid()
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Vendors can view amendments for own bookings" ON public.booking_amendments;
CREATE POLICY "Vendors can view amendments for own bookings"
  ON public.booking_amendments FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE vendor_id = public.get_vendor_id()
    ) OR public.is_admin()
  );


-- =====================================================
-- TABLE 19: PAYMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) NOT NULL,
  
  -- Amount
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'INR',
  
  -- Payment Gateway
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('razorpay', 'stripe', 'paytm', 'cashfree')),
  payment_gateway_order_id TEXT NOT NULL,
  payment_gateway_payment_id TEXT,
  payment_gateway_signature TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'success',
    'failed',
    'refund_pending',
    'refunded'
  )),
  
  -- Webhook Verification
  webhook_verified BOOLEAN DEFAULT FALSE,
  webhook_received_at TIMESTAMP WITH TIME ZONE,
  
  -- Refund Details
  refund_amount DECIMAL(10, 2) CHECK (refund_amount >= 0 AND refund_amount <= amount),
  refund_reason TEXT,
  refund_initiated_at TIMESTAMP WITH TIME ZONE,
  refund_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON public.payments(payment_gateway_order_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can view own payments" ON public.payments;
CREATE POLICY "Customers can view own payments"
  ON public.payments FOR SELECT
  USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Vendors can view own booking payments" ON public.payments;
CREATE POLICY "Vendors can view own booking payments"
  ON public.payments FOR SELECT
  USING (vendor_id = public.get_vendor_id() OR public.is_admin());

-- Trigger: Auto-confirm booking on payment success
CREATE OR REPLACE FUNCTION auto_confirm_booking_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND NEW.webhook_verified = TRUE THEN
    UPDATE public.bookings
    SET status = 'confirmed', updated_at = NOW()
    WHERE id = NEW.booking_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS confirm_booking_on_payment_success ON public.payments;
CREATE TRIGGER confirm_booking_on_payment_success
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'success' AND NEW.webhook_verified = TRUE)
  EXECUTE FUNCTION auto_confirm_booking_on_payment();

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at 
  BEFORE UPDATE ON public.payments
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 20: REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  listing_id UUID REFERENCES public.activity_listings(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Rating (REQUIRED)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Review Content (OPTIONAL)
  title TEXT CHECK (char_length(title) <= 100),
  comment TEXT CHECK (char_length(comment) <= 500),
  
  -- Profanity Detection (Microsoft AI)
  contains_profanity BOOLEAN DEFAULT FALSE,
  
  -- Moderation Status (removed GENERATED - using trigger instead)
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN (
    'pending',
    'auto_approved',
    'flagged',
    'approved',
    'rejected'
  )),
  is_published BOOLEAN DEFAULT FALSE,
  
  -- Admin Review
  flag_reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Vendor Response
  vendor_response TEXT CHECK (char_length(vendor_response) <= 300),
  vendor_responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON public.reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON public.reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON public.reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON public.reviews(moderation_status);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.reviews;
CREATE POLICY "Anyone can view published reviews"
  ON public.reviews FOR SELECT
  USING (is_published = TRUE OR customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can create reviews for completed bookings" ON public.reviews;
CREATE POLICY "Customers can create reviews for completed bookings"
  ON public.reviews FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND booking_id IN (
      SELECT id FROM public.bookings
      WHERE customer_id = auth.uid() AND status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Vendors can respond to reviews" ON public.reviews;
CREATE POLICY "Vendors can respond to reviews"
  ON public.reviews FOR UPDATE
  USING (vendor_id = public.get_vendor_id())
  WITH CHECK (vendor_id = public.get_vendor_id() AND vendor_response IS NOT NULL);

DROP POLICY IF EXISTS "Admins can moderate all reviews" ON public.reviews;
CREATE POLICY "Admins can moderate all reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin());

-- Trigger: Rate limit (5 reviews/day)
CREATE OR REPLACE FUNCTION enforce_review_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  reviews_today INTEGER;
BEGIN
  SELECT COUNT(*) INTO reviews_today
  FROM public.reviews
  WHERE customer_id = NEW.customer_id
    AND created_at::DATE = CURRENT_DATE;
  
  IF reviews_today >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 reviews per day allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_review_rate_limit ON public.reviews;
CREATE TRIGGER check_review_rate_limit
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION enforce_review_rate_limit();

-- Trigger: Auto-update is_published based on moderation_status
CREATE OR REPLACE FUNCTION auto_update_review_published_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_published := (NEW.moderation_status IN ('auto_approved', 'approved'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_review_published_status ON public.reviews;
CREATE TRIGGER update_review_published_status
  BEFORE INSERT OR UPDATE OF moderation_status ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_review_published_status();

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_reviews_updated_at ON public.reviews;
CREATE TRIGGER set_reviews_updated_at 
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 21: VENDOR_COMMISSION_SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Commission (Admin-controlled)
  commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 15.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  custom_commission_reason TEXT,
  
  -- Cancellation Policy
  cancellation_window_hours INTEGER NOT NULL DEFAULT 48 CHECK (cancellation_window_hours >= 1 AND cancellation_window_hours <= 720),
  cancellation_refund_percentage DECIMAL(5, 2) DEFAULT 100.00 CHECK (cancellation_refund_percentage >= 0 AND cancellation_refund_percentage <= 100),
  
  -- Payment Terms
  settlement_cycle TEXT DEFAULT 'weekly' CHECK (settlement_cycle IN ('daily', 'weekly', 'biweekly', 'monthly')),
  minimum_payout_amount DECIMAL(10, 2) DEFAULT 1000.00 CHECK (minimum_payout_amount >= 0),
  
  -- Bank Verification
  bank_details_verified BOOLEAN DEFAULT FALSE,
  bank_verification_date TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_commission_vendor ON public.vendor_commission_settings(vendor_id);

-- Enable RLS
ALTER TABLE public.vendor_commission_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can view own commission settings" ON public.vendor_commission_settings;
CREATE POLICY "Vendors can view own commission settings"
  ON public.vendor_commission_settings FOR SELECT
  USING (vendor_id = public.get_vendor_id() OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can manage commission settings" ON public.vendor_commission_settings;
CREATE POLICY "Only admins can manage commission settings"
  ON public.vendor_commission_settings FOR ALL
  USING (public.is_admin());


-- =====================================================
-- TABLE 22: SETTLEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE RESTRICT NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT NOT NULL,
  
  -- Amount Breakdown
  booking_amount DECIMAL(10, 2) NOT NULL CHECK (booking_amount >= 0),
  commission_percentage DECIMAL(5, 2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  commission_amount DECIMAL(10, 2) NOT NULL CHECK (commission_amount >= 0 AND commission_amount <= booking_amount),
  vendor_payout_amount DECIMAL(10, 2) NOT NULL CHECK (vendor_payout_amount >= 0 AND vendor_payout_amount <= booking_amount),
  
  -- Settlement Lifecycle
  status TEXT NOT NULL DEFAULT 'pending_settlement' CHECK (status IN (
    'pending_settlement',
    'ready_for_review',
    'approved',
    'processing',
    'completed',
    'failed',
    'on_hold',
    'cancelled'
  )),
  
  -- Eligibility
  eligible_for_settlement_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Approval Workflow
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Payout Details
  payout_method TEXT CHECK (payout_method IN ('bank_transfer', 'upi')),
  payout_reference TEXT,
  payout_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settlements_vendor ON public.settlements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_settlements_booking ON public.settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_eligible ON public.settlements(eligible_for_settlement_at);

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Vendors can view own settlements" ON public.settlements;
CREATE POLICY "Vendors can view own settlements"
  ON public.settlements FOR SELECT
  USING (vendor_id = public.get_vendor_id() OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can manage settlements" ON public.settlements;
CREATE POLICY "Only admins can manage settlements"
  ON public.settlements FOR ALL
  USING (public.is_admin());

-- Trigger: Auto-create settlement on payment success
CREATE OR REPLACE FUNCTION create_settlement_on_payment_success()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  vendor_commission DECIMAL(5, 2);
  commission_amt DECIMAL(10, 2);
  payout_amt DECIMAL(10, 2);
BEGIN
  IF NEW.status = 'success' AND NEW.webhook_verified = TRUE THEN
    SELECT * INTO booking_record FROM public.bookings WHERE id = NEW.booking_id;
    
    SELECT commission_percentage INTO vendor_commission
    FROM public.vendor_commission_settings
    WHERE vendor_id = booking_record.vendor_id;
    
    IF vendor_commission IS NULL THEN
      vendor_commission := 15.00;
    END IF;
    
    commission_amt := ROUND(NEW.amount * vendor_commission / 100, 2);
    payout_amt := NEW.amount - commission_amt;
    
    INSERT INTO public.settlements (
      vendor_id, booking_id, payment_id,
      booking_amount, commission_percentage,
      commission_amount, vendor_payout_amount,
      eligible_for_settlement_at, status
    ) VALUES (
      booking_record.vendor_id, NEW.booking_id, NEW.id,
      NEW.amount, vendor_commission,
      commission_amt, payout_amt,
      booking_record.end_date + INTERVAL '48 hours',
      'pending_settlement'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_settlement_on_payment ON public.payments;
CREATE TRIGGER create_settlement_on_payment
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'success' AND NEW.webhook_verified = TRUE)
  EXECUTE FUNCTION create_settlement_on_payment_success();

-- Trigger: Prevent amount modifications
CREATE OR REPLACE FUNCTION prevent_settlement_amount_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commission_percentage != OLD.commission_percentage 
     OR NEW.commission_amount != OLD.commission_amount 
     OR NEW.vendor_payout_amount != OLD.vendor_payout_amount THEN
    RAISE EXCEPTION 'Cannot modify commission or payout amounts';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_settlement_modifications ON public.settlements;
CREATE TRIGGER prevent_settlement_modifications
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_settlement_amount_changes();

-- Trigger: Update updated_at
DROP TRIGGER IF EXISTS set_settlements_updated_at ON public.settlements;
CREATE TRIGGER set_settlements_updated_at 
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================
-- TABLE 23: ADMIN_ROLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'operations', 'finance', 'support')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Only super admins can manage admin roles" ON public.admin_roles;
CREATE POLICY "Only super admins can manage admin roles"
  ON public.admin_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );


-- =====================================================
-- TABLE 24: ADMIN_ACTIONS_LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON public.admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_entity ON public.admin_actions_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Only admins can view action logs" ON public.admin_actions_log;
CREATE POLICY "Only admins can view action logs"
  ON public.admin_actions_log FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "System can insert action logs" ON public.admin_actions_log;
CREATE POLICY "System can insert action logs"
  ON public.admin_actions_log FOR INSERT
  WITH CHECK (TRUE);


-- =====================================================
-- CRITICAL FIXES (FIXED: renamed current_date variable)
-- =====================================================

-- Fix: Release capacity on cancellation
CREATE OR REPLACE FUNCTION release_capacity_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_current_date DATE;
BEGIN
  IF NEW.status IN ('cancelled_by_customer', 'cancelled_by_vendor', 'no_show') 
     AND OLD.status NOT IN ('cancelled_by_customer', 'cancelled_by_vendor', 'no_show') THEN
    
    v_current_date := OLD.start_date;
    
    WHILE v_current_date <= OLD.end_date LOOP
      UPDATE public.listing_daily_capacity
      SET 
        booked_count = GREATEST(0, booked_count - OLD.number_of_participants),
        updated_at = NOW()
      WHERE listing_id = OLD.listing_id
        AND availability_date = v_current_date
        AND (time_slot_id = OLD.time_slot_id OR (time_slot_id IS NULL AND OLD.time_slot_id IS NULL));
      
      v_current_date := v_current_date + 1;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS release_capacity_on_booking_cancellation ON public.bookings;
CREATE TRIGGER release_capacity_on_booking_cancellation
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION release_capacity_on_cancellation();

-- Fix: Auto-create capacity on listing approval
CREATE OR REPLACE FUNCTION initialize_listing_capacity(
  p_listing_id UUID,
  p_time_slot_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '90 days'
)
RETURNS void AS $$
DECLARE
  v_current_date DATE;
  default_capacity INTEGER;
BEGIN
  IF p_time_slot_id IS NOT NULL THEN
    SELECT max_capacity INTO default_capacity
    FROM public.activity_time_slots
    WHERE id = p_time_slot_id;
  ELSE
    SELECT max_participants_per_day INTO default_capacity
    FROM public.activity_listings
    WHERE id = p_listing_id;
  END IF;
  
  IF default_capacity IS NULL THEN
    RETURN;
  END IF;
  
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    INSERT INTO public.listing_daily_capacity (
      listing_id, time_slot_id, availability_date,
      total_capacity, booked_count, offline_bookings
    ) VALUES (
      p_listing_id, p_time_slot_id, v_current_date,
      default_capacity, 0, 0
    )
    ON CONFLICT (listing_id, availability_date, time_slot_id) 
    DO NOTHING;
    
    v_current_date := v_current_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_create_capacity_on_listing_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM initialize_listing_capacity(
      NEW.id, NULL, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_capacity_on_listing_approval ON public.activity_listings;
CREATE TRIGGER create_capacity_on_listing_approval
  AFTER UPDATE ON public.activity_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_capacity_on_listing_approval();

CREATE OR REPLACE FUNCTION auto_create_capacity_on_slot_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_listing_capacity(
    NEW.listing_id, NEW.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_capacity_on_slot_creation ON public.activity_time_slots;
CREATE TRIGGER create_capacity_on_slot_creation
  AFTER INSERT ON public.activity_time_slots
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION auto_create_capacity_on_slot_creation();

CREATE OR REPLACE FUNCTION ensure_capacity_row_exists()
RETURNS TRIGGER AS $$
DECLARE
  capacity_exists BOOLEAN;
  default_capacity INTEGER;
  v_current_date DATE;
BEGIN
  v_current_date := NEW.start_date;
  
  WHILE v_current_date <= NEW.end_date LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.listing_daily_capacity
      WHERE listing_id = NEW.listing_id
        AND availability_date = v_current_date
        AND (time_slot_id = NEW.time_slot_id OR (time_slot_id IS NULL AND NEW.time_slot_id IS NULL))
    ) INTO capacity_exists;
    
    IF NOT capacity_exists THEN
      IF NEW.time_slot_id IS NOT NULL THEN
        SELECT max_capacity INTO default_capacity
        FROM public.activity_time_slots
        WHERE id = NEW.time_slot_id;
      ELSE
        SELECT max_participants_per_day INTO default_capacity
        FROM public.activity_listings
        WHERE id = NEW.listing_id;
      END IF;
      
      INSERT INTO public.listing_daily_capacity (
        listing_id, time_slot_id, availability_date,
        total_capacity, booked_count, offline_bookings
      ) VALUES (
        NEW.listing_id, NEW.time_slot_id, v_current_date,
        COALESCE(default_capacity, 10), 0, 0
      );
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_capacity_exists_before_booking ON public.bookings;
CREATE TRIGGER ensure_capacity_exists_before_booking
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_capacity_row_exists();


-- =====================================================
-- PART 3 COMPLETE - ALL 24 TABLES CREATED
-- =====================================================
-- All errors fixed:
-- ✅ IMMUTABLE error (removed NOW() from GENERATED columns)
-- ✅ Syntax error (renamed current_date to v_current_date)
-- ✅ All triggers and functions working
-- Database is production-ready!
-- =====================================================


-- Policy 1: Users upload to own folder only
CREATE POLICY "Users upload to own folder only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vendor-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users view own files only
CREATE POLICY "Users view own files only"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vendor-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users delete own files only
CREATE POLICY "Users delete own files only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vendor-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- FOR development rls policy drop

-- Temporarily relax vendors table RLS for development
DROP POLICY IF EXISTS "Vendors can update own profile (except status)" ON public.vendors;

CREATE POLICY "Vendors can update own profile (development)"
  ON public.vendors FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also relax vendor_documents policies
DROP POLICY IF EXISTS "Vendors can upload documents" ON public.vendor_documents;

CREATE POLICY "Vendors can upload documents (development)"
  ON public.vendor_documents FOR INSERT
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors can view own documents" ON public.vendor_documents;

CREATE POLICY "Vendors can view own documents (development)"
  ON public.vendor_documents FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );


  -- Approval script

  -- Step 1: Approve vendor status
UPDATE public.vendors 
SET 
  status = 'approved',
  approved_at = NOW(),
  approved_by = (SELECT id FROM auth.users WHERE email = 'neotrip03@gmail.com' LIMIT 1)
WHERE user_id = 'aafe8320-3d0c-4e08-ad39-75d708cac591';

-- Step 2: Approve ALL documents for this vendor
UPDATE public.vendor_documents 
SET 
  status = 'approved',
  approved_at = NOW(),
  approved_by = (SELECT id FROM auth.users WHERE email = 'neotrip03@gmail.com' LIMIT 1)
WHERE vendor_id = 'b4afcf01-f202-4841-9323-02fe99402178';

-- Step 3: Verify changes
SELECT status, onboarding_completed, approved_at FROM public.vendors 
WHERE user_id = 'aafe8320-3d0c-4e08-ad39-75d708cac591';

SELECT document_type, status FROM public.vendor_documents 
WHERE vendor_id = 'b4afcf01-f202-4841-9323-02fe99402178';