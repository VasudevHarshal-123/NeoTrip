<!-- pages/auth/callback.vue -->
<script setup>
  definePageMeta({
    name: 'auth-callback',
  });
  
  const router = useRouter();
  const loading = ref(true);
  const errorMessage = ref('');
  
  const supabase = ref(null);
  
  onMounted(async () => {
    try {
      const nuxtApp = useNuxtApp();
      supabase.value = nuxtApp.$supabase.client;
  
      console.log('🔵 Callback: Supabase initialized');
  
      const { data: { session }, error: sessionError } = await supabase.value.auth.getSession();
      console.log('🔵 Callback: Session data:', { session, error: sessionError });
  
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No session found');
  
      const user = session.user;
      console.log('🔵 Callback: User:', user.id, user.email);
  
      const { data: vendorData, error: vendorError } = await supabase.value
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
  
      console.log('🔵 Callback: Vendor lookup:', { vendorData, error: vendorError });
  
      if (vendorError && vendorError.code !== 'PGRST116') {
        throw vendorError;
      }
  
      if (!vendorData) {
        console.log('🔵 Callback: Creating new vendor record');
        
        const { error: insertError } = await supabase.value
          .from('vendors')
          .insert({
            user_id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Vendor',
            phone: user.user_metadata?.phone || '',
            email: user.email,
            onboarding_completed: false,
          });
  
        if (insertError) {
          console.error('❌ Callback: Insert error:', insertError);
          throw insertError;
        }
  
        console.log('✅ Callback: Vendor record created, redirecting to onboarding');
        // ✅ FIX: Keep loading true during navigation
        await router.push('/onboarding');
      } else {
        console.log('🔵 Callback: Existing vendor, onboarding_completed:', vendorData.onboarding_completed);
        
        if (vendorData.onboarding_completed) {
          console.log('✅ Callback: Redirecting to dashboard');
          // ✅ FIX: Keep loading true during navigation
          await router.push('/dashboard');
        } else {
          console.log('✅ Callback: Redirecting to onboarding');
          // ✅ FIX: Keep loading true during navigation
          await router.push('/onboarding');
        }
      }
      // ✅ FIX: Don't set loading=false, let the next page render
    } catch (error) {
      console.error('❌ Auth callback error:', error);
      errorMessage.value = error.message || 'Authentication failed';
      loading.value = false; // ✅ Only set false on error
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
    // ✅ FIX: Remove finally block that was setting loading=false
  });
  </script>
  
<template>
  <v-app>
    <v-main class="d-flex align-center" style="min-height: 100vh; background: #f5f5f5;">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card elevation="8" rounded="lg" class="pa-8">
              <div v-if="loading" class="text-center">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="64"
                  class="mb-4"
                />
                <h2 class="text-h5 mb-2">Completing sign in...</h2>
                <p class="text-body-2 text-medium-emphasis">
                  Please wait while we set up your account
                </p>
              </div>

              <div v-else-if="errorMessage" class="text-center">
                <v-icon size="64" color="error" class="mb-4">
                  mdi-alert-circle
                </v-icon>
                <h2 class="text-h5 mb-2">Authentication Failed</h2>
                <p class="text-body-2 text-error mb-4">
                  {{ errorMessage }}
                </p>
                <p class="text-caption text-medium-emphasis">
                  Redirecting to login...
                </p>
              </div>

              <div v-else class="text-center">
                <v-icon size="64" color="success" class="mb-4">
                  mdi-check-circle
                </v-icon>
                <h2 class="text-h5 mb-2">Success!</h2>
                <p class="text-body-2 text-medium-emphasis">
                  Redirecting you now...
                </p>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>