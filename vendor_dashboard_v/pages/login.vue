<!-- pages/login.vue -->
<script setup>
definePageMeta({
  name: 'login',
});

const router = useRouter();

// Form state
const isSignUp = ref(false);
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const name = ref(''); // NEW: Vendor name
const phone = ref(''); // NEW: Phone number
const acceptedTerms = ref(false); // NEW: T&C acceptance
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const showTermsModal = ref(false); // NEW: T&C modal

// Initialize Supabase
const supabase = ref(null);
const isReady = ref(false);

onMounted(() => {
  const nuxtApp = useNuxtApp();
  supabase.value = nuxtApp.$supabase.client;
  isReady.value = true;
  console.log('✅ Supabase ready:', supabase.value);
});

// Toggle between login and signup
const toggleMode = () => {
  isSignUp.value = !isSignUp.value;
  errorMessage.value = '';
  successMessage.value = '';
  password.value = '';
  confirmPassword.value = '';
  name.value = '';
  phone.value = '';
  acceptedTerms.value = false;
};

// Handle Terms & Conditions acceptance
const handleTermsAccept = () => {
  acceptedTerms.value = true;
  showTermsModal.value = false;
};

// Check if email already exists
const checkEmailExists = async (emailToCheck) => {
  try {
    const { data, error } = await supabase.value
      .from('vendors')
      .select('email')
      .eq('email', emailToCheck)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      console.error('Error checking email:', error);
      return false;
    }

    return !!data; // Returns true if email exists
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

// Handle Sign Up
const handleSignUp = async () => {
  if (!supabase.value) {
    errorMessage.value = 'Please wait, loading...';
    return;
  }

  errorMessage.value = '';
  successMessage.value = '';

  // Validate name
  if (!name.value || name.value.trim().length < 2) {
    errorMessage.value = 'Please enter your full name';
    return;
  }

  // Validate phone
  if (!phone.value || phone.value.trim().length < 10) {
    errorMessage.value = 'Please enter a valid phone number';
    return;
  }

  // Validate email
  if (!email.value || !email.value.includes('@')) {
    errorMessage.value = 'Please enter a valid email';
    return;
  }

  // Check if email already exists
  const emailExists = await checkEmailExists(email.value);
  if (emailExists) {
    errorMessage.value = 'This email is already registered. Please sign in instead.';
    return;
  }

  // Validate password match
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match';
    return;
  }

  // Validate password length
  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters';
    return;
  }

  // Validate T&C acceptance
  if (!acceptedTerms.value) {
    errorMessage.value = 'You must accept the Terms and Conditions to continue';
    return;
  }

  loading.value = true;

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.value.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          name: name.value,
          phone: phone.value,
        },
      },
    });

    if (authError) throw authError;

    if (authData.user) {
      // Create vendor record
      const { error: vendorError } = await supabase.value
        .from('vendors')
        .insert({
          user_id: authData.user.id,
          name: name.value,
          phone: phone.value,
          email: email.value,
          onboarding_completed: false,
        });

      if (vendorError) throw vendorError;

      successMessage.value = 'Account created successfully! Redirecting...';
      
      // Clear form
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
      name.value = '';
      phone.value = '';
      acceptedTerms.value = false;

      // Redirect to onboarding after 2 seconds
      setTimeout(() => {
        router.push('/onboarding');
      }, 2000);
    }
  } catch (error) {
    console.error('Signup error:', error);
    errorMessage.value = error.message || 'Failed to create account';
  } finally {
    loading.value = false;
  }
};

// Handle Sign In
const handleSignIn = async () => {
  if (!supabase.value) {
    errorMessage.value = 'Please wait, loading...';
    return;
  }

  errorMessage.value = '';
  successMessage.value = '';
  loading.value = true;

  try {
    const { data, error } = await supabase.value.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    // Check if vendor has completed onboarding
    const { data: vendorData } = await supabase.value
      .from('vendors')
      .select('onboarding_completed')
      .eq('user_id', data.user.id)
      .single();

    if (!vendorData || !vendorData.onboarding_completed) {
      await router.push('/onboarding');
    } else {
      await router.push('/dashboard');
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
};

// Handle Google Sign In
const handleGoogleSignIn = async () => {
  if (!supabase.value) {
    errorMessage.value = 'Please wait, loading...';
    return;
  }

  console.log('🔵 Starting Google OAuth...');
  errorMessage.value = '';
  loading.value = true;

  try {
    const { data, error } = await supabase.value.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    console.log('🔵 OAuth result:', { data, error });

    if (error) throw error;
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    errorMessage.value = error.message || 'Failed to sign in with Google';
    loading.value = false;
  }
};
</script>

<template>
  <ClientOnly>
    <v-app>
      <v-main 
        class="d-flex align-center" 
        style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
      >
        <v-container>
          <v-row justify="center">
            <v-col cols="12" sm="10" md="8" lg="5" xl="4">
              <!-- Loading state -->
              <v-card v-if="!isReady" elevation="12" rounded="lg" class="mx-auto pa-8">
                <div class="text-center">
                  <v-progress-circular indeterminate color="primary" size="48" />
                  <p class="mt-4">Loading...</p>
                </div>
              </v-card>

              <!-- Main card -->
              <v-card v-else elevation="12" rounded="lg" class="mx-auto">
                <v-card-title class="text-center py-6 py-sm-8">
                  <div class="w-100">
                    <v-icon size="64" color="primary" class="mb-4">
                      mdi-store
                    </v-icon>
                    <h1 class="text-h4 text-sm-h3 font-weight-bold">
                      {{ isSignUp ? 'Create Account' : 'Vendor Login' }}
                    </h1>
                    <p class="text-body-2 text-medium-emphasis mt-2">
                      {{ isSignUp ? 'Join NeoTrips vendor platform' : 'Welcome back to NeoTrips!' }}
                    </p>
                  </div>
                </v-card-title>

                <v-card-text class="px-4 px-sm-8 pb-6 pb-sm-8">
                  <!-- Alerts -->
                  <v-alert
                    v-if="successMessage"
                    type="success"
                    variant="tonal"
                    class="mb-4"
                    density="compact"
                  >
                    {{ successMessage }}
                  </v-alert>

                  <v-alert
                    v-if="errorMessage"
                    type="error"
                    variant="tonal"
                    class="mb-4"
                    density="compact"
                  >
                    {{ errorMessage }}
                  </v-alert>

                  <!-- Google Button -->
                  <v-btn
                    color="primary"
                    size="x-large"
                    block
                    :loading="loading"
                    class="mb-4 text-none"
                    elevation="2"
                    @click="handleGoogleSignIn"
                  >
                    <v-icon class="mr-2" size="24">
                      mdi-google
                    </v-icon>
                    <span class="text-h6">Continue with Google</span>
                  </v-btn>

                  <!-- Divider -->
                  <div class="d-flex align-center my-4">
                    <v-divider />
                    <span class="px-3 text-caption text-medium-emphasis">OR</span>
                    <v-divider />
                  </div>

                  <!-- Sign Up Fields -->
                  <div v-if="isSignUp">
                    <v-text-field
                      v-model="name"
                      label="Full Name *"
                      type="text"
                      variant="outlined"
                      prepend-inner-icon="mdi-account"
                      class="mb-3"
                      :disabled="loading"
                      density="comfortable"
                      autocomplete="name"
                    />

                    <v-text-field
                      v-model="phone"
                      label="Phone Number *"
                      type="tel"
                      variant="outlined"
                      prepend-inner-icon="mdi-phone"
                      class="mb-3"
                      :disabled="loading"
                      density="comfortable"
                      autocomplete="tel"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>

                  <!-- Email/Password Form (Common for both) -->
                  <v-text-field
                    v-model="email"
                    label="Email *"
                    type="email"
                    variant="outlined"
                    prepend-inner-icon="mdi-email"
                    class="mb-3"
                    :disabled="loading"
                    density="comfortable"
                    autocomplete="email"
                  />

                  <v-text-field
                    v-model="password"
                    label="Password *"
                    :type="showPassword ? 'text' : 'password'"
                    variant="outlined"
                    prepend-inner-icon="mdi-lock"
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    class="mb-3"
                    :disabled="loading"
                    density="comfortable"
                    :autocomplete="isSignUp ? 'new-password' : 'current-password'"
                    @click:append-inner="showPassword = !showPassword"
                  />

                  <v-text-field
                    v-if="isSignUp"
                    v-model="confirmPassword"
                    label="Confirm Password *"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    variant="outlined"
                    prepend-inner-icon="mdi-lock-check"
                    :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    class="mb-3"
                    :disabled="loading"
                    density="comfortable"
                    autocomplete="new-password"
                    @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  />

                  <!-- Terms & Conditions Checkbox (Sign Up only) -->
                  <div v-if="isSignUp" class="mb-4">
                    <v-checkbox
                      v-model="acceptedTerms"
                      :disabled="loading"
                      density="compact"
                      hide-details
                    >
                      <template #label>
                        <span class="text-body-2">
                          I accept the 
                          <a
                            href="#"
                            class="text-primary text-decoration-none"
                            @click.prevent="showTermsModal = true"
                          >
                            Terms and Conditions
                          </a>
                        </span>
                      </template>
                    </v-checkbox>
                  </div>

                  <!-- Submit Button -->
                  <v-btn
                    color="secondary"
                    variant="outlined"
                    size="large"
                    block
                    :loading="loading"
                    class="mb-4 text-none"
                    @click="isSignUp ? handleSignUp() : handleSignIn()"
                  >
                    <span class="text-h6">{{ isSignUp ? 'Sign Up' : 'Sign In' }}</span>
                  </v-btn>

                  <!-- Toggle Mode -->
                  <div class="text-center mt-4">
                    <v-btn
                      variant="text"
                      color="primary"
                      class="text-none"
                      @click="toggleMode"
                    >
                      {{ isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>

      <!-- Terms & Conditions Modal -->
      <TermsConditionsModal
        v-model="showTermsModal"
        @accept="handleTermsAccept"
      />
    </v-app>
  </ClientOnly>
</template>