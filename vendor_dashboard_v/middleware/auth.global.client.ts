// File: middleware/auth-global-client.ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  
  const publicPages = ['/login', '/', '/auth/callback'];
  if (publicPages.includes(to.path)) return;
  
  const nuxtApp = useNuxtApp();
  const supabase = (nuxtApp.$supabase as { client: any }).client;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigateTo('/login');

    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, onboarding_completed, status, onboarding_step')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!vendor) {
      return to.path === '/onboarding' ? null : navigateTo('/onboarding');
    }

    // ✅ FIXED: Check documents
    const { data: documents } = await supabase
      .from('vendor_documents')
      .select('document_type, status, document_category')
      .eq('vendor_id', vendor.id);

    const hasPAN = documents?.some(d => d.document_type === 'pan_card' && d.status === 'approved');
    const hasAadhaar = documents?.some(d => d.document_type === 'aadhaar_card' && d.status === 'approved');
    const hasPassbook = documents?.some(d => d.document_type === 'passbook' && d.status === 'approved');
    const hasCertificate = documents?.some(d => d.document_category === 'activity_license' && d.status === 'approved');
    const allDocsApproved = hasPAN && hasAadhaar && hasPassbook && hasCertificate;

    // ✅ FIXED LOGIC:
    if (vendor.status === 'approved' && vendor.onboarding_completed && allDocsApproved) {
      // ✅ APPROVED USERS CAN ACCESS ALL DASHBOARD ROUTES
      console.log('✅ Middleware: Fully approved - allowing all dashboard routes');
      return; // ALLOW ALL /dashboard/** routes
    }

    // Not approved → only allow onboarding
    if (to.path !== '/onboarding') {
      console.log('⏳ Middleware: Not approved - redirecting to onboarding');
      return navigateTo('/onboarding');
    }

  } catch (error) {
    console.error('Auth check failed:', error);
    return navigateTo('/login');
  }
});
