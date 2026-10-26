<!-- 
  File: pages/onboarding.vue
  Path: pages/onboarding.vue
  Description: Main onboarding page with stepper - shows ONE step at a time
-->

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import OnboardingStep1 from '~/components/onboarding/OnboardingStep1.vue'
  import OnboardingStep2 from '~/components/onboarding/OnboardingStep2.vue'
  import OnboardingStep3 from '~/components/onboarding/OnboardingStep3.vue'
  import { useVendorStore } from '~/store/vendor.store';
  
  definePageMeta({
    layout: 'dashboard',
    name: 'onboarding',
    middleware: ['auth-global-client']
  })
  
  const router = useRouter()
  const supabase = useSupabase()
  
  // Stepper state
  const currentStep = ref(1)
  const loading = ref(false)
  const errorMessage = ref('')
  
  // Status state
  const vendorStatus = ref('loading')
  const vendorData = ref(null)
  
  console.log('🔵 Onboarding: Component initialized')
  
  // Step component refs
  const step1Ref = ref(null)
  const step2Ref = ref(null)
  const step3Ref = ref(null)
  
  // Form data for each step
  const step1Data = ref({
    fullName: '',
    phoneNumber: '',
    companyName: '',
    selectedActivities: []
  })
  
  const step2Data = ref({
    panNumber: '',
    aadhaarNumber: '',
    bankAccountNumber: '',
    bankName: '',
    bankBranch: '',
    bankIfscCode: '',
    upiId: '',
    gstin: '',
    panCardFile: null,
    aadhaarCardFile: null,
    passbookPhotoFile: null,
    panCardPreview: null,
    aadhaarCardPreview: null,
    passbookPreview: null
  })
  
  const step3Data = ref({
    certificates: {},
    customDocuments: []
  })
  
  // Step items for v-stepper
  const steps = [
    { title: 'Basic Info', value: 1 },
    { title: 'Documents', value: 2 },
    { title: 'Certifications', value: 3 }
  ]
  
  // Can proceed to next step
  const canProceed = computed(() => {
    const valid = currentStep.value === 1 ? step1Ref.value?.isValid :
                  currentStep.value === 2 ? step2Ref.value?.isValid :
                  currentStep.value === 3 ? step3Ref.value?.isValid : false
    console.log(`🔵 Onboarding: Step ${currentStep.value} validation =`, valid)
    return valid
  })
  
  // Navigation
  const goNext = async () => {
    if (!canProceed.value) {
      console.log('⚠️ Onboarding: Cannot proceed, validation failed')
      return
    }
  
    console.log(`🔵 Onboarding: Moving from Step ${currentStep.value} to Step ${currentStep.value + 1}`)
    errorMessage.value = ''
    loading.value = true
  
    try {
      const vendorStore = useVendorStore()
  
      // Save current step data before proceeding
      if (currentStep.value === 1) {
        console.log('💾 Onboarding: Saving Step 1 data...', step1Data.value)
        await vendorStore.saveStep1Data(step1Data.value)
        console.log('✅ Onboarding: Step 1 data saved successfully')
      } else if (currentStep.value === 2) {
        console.log('💾 Onboarding: Saving Step 2 data...')
        await vendorStore.saveStep2Data(step2Data.value)
        console.log('✅ Onboarding: Step 2 data saved successfully')
      }
  
      // Move to next step
      currentStep.value++
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('❌ Onboarding: Error saving step:', error)
      errorMessage.value = error.message || 'Failed to save data. Please try again.'
    } finally {
      loading.value = false
    }
  }
  
  const goBack = () => {
    if (currentStep.value > 1) {
      console.log(`🔵 Onboarding: Going back from Step ${currentStep.value} to Step ${currentStep.value - 1}`)
      currentStep.value--
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  
  const handleSubmit = async () => {
    if (!canProceed.value) {
      console.log('⚠️ Onboarding: Cannot submit, validation failed')
      return
    }
  
    console.log('💾 Onboarding: Submitting Step 3 and completing onboarding...')
    loading.value = true
    errorMessage.value = ''
  
    try {
      // Get user directly
      const { data: authData, error: userError } = await supabase.auth.getUser()
      const user = authData?.user
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }
  
      const vendorStore = useVendorStore()
      
      // Save step 3 (also marks onboarding complete)
      console.log('💾 Onboarding: Saving Step 3 data...', step3Data.value)
      await vendorStore.saveStep3Data(step3Data.value)
      console.log('✅ Onboarding: Step 3 data saved successfully')
  
      // Reload vendor data to confirm completion
      console.log('🔍 Onboarding: Reloading vendor data after submission...')
      const { data: updatedVendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, status, onboarding_completed, approval_notes')
        .eq('user_id', user.id)
        .single()
  
      if (vendorError) {
        console.error('❌ Onboarding: Error reloading vendor:', vendorError)
        throw vendorError
      }
  
      console.log('📊 Onboarding: Updated vendor data:', updatedVendor)
  
      // Check if onboarding is marked complete
      if (updatedVendor?.onboarding_completed) {
        console.log('✅ Onboarding: Onboarding marked complete, setting status to PENDING')
        vendorStatus.value = 'pending'
        vendorData.value = updatedVendor
      } else {
        console.warn('⚠️ Onboarding: Onboarding not marked complete in database!')
      }
      
      // Scroll to top to show pending message
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('❌ Onboarding: Submission error:', error)
      errorMessage.value = error.message || 'Failed to complete onboarding.'
    } finally {
      loading.value = false
    }
  }
  
  // Check vendor status on mount
  onMounted(async () => {
    console.log('🔵 Onboarding: onMounted triggered')
    vendorStatus.value = 'loading'
    
    try {
      // Get user directly from Supabase
      const { data: authData, error: userError } = await supabase.auth.getUser()
      const user = authData?.user
      
      console.log('🔍 Onboarding: Auth response:', { user: user?.id, error: userError })
      
      if (userError) {
        console.error('❌ Onboarding: Error getting user:', userError)
        vendorStatus.value = 'new'
        return
      }
  
      if (!user) {
        console.log('⚠️ Onboarding: No user found, cannot proceed')
        vendorStatus.value = 'new'
        return
      }
  
      console.log('🔍 Onboarding: Current user ID:', user.id)
  
      // Get vendor data
      console.log('🔍 Onboarding: Fetching vendor data...')
      const { data: vendors, error: vendorError } = await supabase
        .from('vendors')
        .select('id, name, phone, company_name, onboarding_completed, status, onboarding_step, approval_notes')
        .eq('user_id', user.id)
  
      if (vendorError) {
        console.error('❌ Onboarding: Error fetching vendor:', vendorError)
        vendorStatus.value = 'new'
        return
      }
  
      const vendor = vendors?.[0] // Get first result
  
      console.log('📊 Onboarding: Vendor data:', vendor)
  
      // Vendor doesn't exist yet → New vendor
      if (!vendor) {
        console.log('🆕 Onboarding: No vendor record found, showing form for NEW vendor')
        vendorStatus.value = 'new'
        return
      }
  
      // Store vendor data
      vendorData.value = vendor
  
      // Check document upload status
      console.log('🔍 Onboarding: Checking uploaded documents for vendor ID:', vendor.id)
      const { data: documents, error: docsError } = await supabase
        .from('vendor_documents')
        .select('document_type, status, document_category')
        .eq('vendor_id', vendor.id)
  
      if (docsError) {
        console.error('❌ Onboarding: Error fetching documents:', docsError)
      }
  
      console.log('📄 Onboarding: Documents:', documents)
  
      const hasPAN = documents?.some(d => d.document_type === 'pan_card' && d.status === 'approved')
      const hasAadhaar = documents?.some(d => d.document_type === 'aadhaar_card' && d.status === 'approved')
      const hasPassbook = documents?.some(d => d.document_type === 'passbook' && d.status === 'approved')
      const hasCertificate = documents?.some(d => d.document_category === 'activity_license' && d.status === 'approved')
  
      console.log('📋 Onboarding: Document approval status:', {
        PAN: hasPAN,
        Aadhaar: hasAadhaar,
        Passbook: hasPassbook,
        Certificate: hasCertificate
      })
  
      const allDocsApproved = hasPAN && hasAadhaar && hasPassbook && hasCertificate
  
      // Decision tree with extensive logging
      console.log('🔍 Onboarding: Evaluating vendor status...')
      console.log('   - vendor.status:', vendor.status)
      console.log('   - vendor.onboarding_completed:', vendor.onboarding_completed)
      console.log('   - allDocsApproved:', allDocsApproved)
  
      // APPROVED + ALL DOCS APPROVED → Redirect to dashboard
      if (vendor.status === 'approved' && vendor.onboarding_completed && allDocsApproved) {
        console.log('✅ Onboarding: Vendor FULLY APPROVED, redirecting to dashboard')
        vendorStatus.value = 'approved'
        // router.push('/dashboard')
        return
      }
  
      // REJECTED → Show rejection screen
      if (vendor.status === 'rejected') {
        console.log('❌ Onboarding: Vendor REJECTED, showing rejection screen')
        vendorStatus.value = 'rejected'
        return
      }
  
      // ONBOARDING COMPLETED → Show pending screen (regardless of doc approval status)
      if (vendor.onboarding_completed) {
        console.log('⏳ Onboarding: Onboarding COMPLETED but awaiting approval, showing PENDING screen')
        vendorStatus.value = 'pending'
        return
      }
  
      // ONBOARDING NOT COMPLETED → Show form
      console.log('📝 Onboarding: Onboarding NOT completed, showing form')
      vendorStatus.value = 'new'
      
      // Pre-fill existing data
      if (vendor.name) {
        step1Data.value.fullName = vendor.name
        console.log('   - Pre-filled name:', vendor.name)
      }
      if (vendor.phone) {
        step1Data.value.phoneNumber = vendor.phone
        console.log('   - Pre-filled phone:', vendor.phone)
      }
      if (vendor.company_name) {
        step1Data.value.companyName = vendor.company_name
        console.log('   - Pre-filled company:', vendor.company_name)
      }
      
      // Resume from last step
      if (vendor.onboarding_step && vendor.onboarding_step <= 3) {
        currentStep.value = vendor.onboarding_step
        console.log('   - Resuming from step:', vendor.onboarding_step)
      }
    } catch (error) {
      console.error('❌ Onboarding: Fatal error in onMounted:', error)
      vendorStatus.value = 'new' // Fallback to showing form
    }
  })
  </script>
  
  <template>
    <div class="onboarding-container">
      <!-- Error Alert -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        closable
        class="mb-6"
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>
  
      <!-- Loading State -->
      <v-card v-if="vendorStatus === 'loading'" elevation="2" class="pa-8 text-center">
        <v-progress-circular indeterminate color="primary" size="64" class="mb-4" />
        <p class="text-h6">Loading your onboarding status...</p>
      </v-card>
  
      <!-- Pending Approval State -->
      <v-card v-else-if="vendorStatus === 'pending'" elevation="2" class="pa-8 text-center">
        <v-icon icon="mdi-clock-outline" size="80" color="warning" class="mb-4" />
        <h2 class="text-h4 font-weight-bold mb-3">Application Under Review</h2>
        <p class="text-h6 text-medium-emphasis mb-6">
          Your onboarding application has been submitted successfully.<br />
          Our team is reviewing your documents and will notify you once approved.
        </p>
        <v-chip color="warning" variant="tonal" size="large" class="mb-6">
          <v-icon icon="mdi-timer-sand" start />
          Status: Pending Approval
        </v-chip>
        
        <v-divider class="my-6" />
        
        <v-btn 
          variant="outlined" 
          prepend-icon="mdi-view-dashboard"
          @click="() => router.push('/dashboard')"
        >
          Go to Dashboard
        </v-btn>
        <v-btn 
          variant="outlined" 
          color="primary"
          prepend-icon="mdi-email"
          href="/dashboard/contact"
        >
          Contact Support
        </v-btn>
      </v-card>
  
      <!-- Rejected State -->
      <v-card v-else-if="vendorStatus === 'rejected'" elevation="2" class="pa-8 text-center">
        <v-icon icon="mdi-close-circle-outline" size="80" color="error" class="mb-4" />
        <h2 class="text-h4 font-weight-bold mb-3">Application Rejected</h2>
        <p class="text-h6 text-medium-emphasis mb-4">
          Unfortunately, your application was not approved.
        </p>
        
        <v-alert 
          v-if="vendorData?.approval_notes" 
          type="error" 
          variant="tonal" 
          class="mb-6 text-left"
        >
          <div class="text-subtitle-2 font-weight-bold mb-2">Rejection Reason:</div>
          <div>{{ vendorData.approval_notes }}</div>
        </v-alert>
        
        <v-chip color="error" variant="tonal" size="large" class="mb-6">
          <v-icon icon="mdi-alert-circle" start />
          Status: Rejected
        </v-chip>
        
        <v-divider class="my-6" />
        
        <v-btn 
          color="primary" 
          size="large"
          prepend-icon="mdi-email" 
          @click="router.push('/dashboard/contact')"
        >
          Contact Support
        </v-btn>
      </v-card>
  
      <!-- Onboarding Form (Only show if status is 'new') -->
      <template v-else-if="vendorStatus === 'new'">
        <!-- Stepper Header -->
        <v-stepper
          v-model="currentStep"
          alt-labels
          elevation="0"
          class="mb-6"
        >
          <v-stepper-header>
            <template v-for="(step, index) in steps" :key="step.value">
              <v-stepper-item
                :complete="currentStep > step.value"
                :value="step.value"
                :color="currentStep > step.value ? 'success' : 'primary'"
              >
                <template #title>
                  <span class="text-subtitle-2">{{ step.title }}</span>
                </template>
              </v-stepper-item>
  
              <v-divider v-if="index < steps.length - 1" />
            </template>
          </v-stepper-header>
        </v-stepper>
  
        <!-- Step Content -->
        <v-card elevation="2" class="pa-4 pa-md-6">
          <v-window v-model="currentStep">
            <!-- Step 1: Basic Information -->
            <v-window-item :value="1">
              <OnboardingStep1
                ref="step1Ref"
                v-model="step1Data"
              />
            </v-window-item>
  
            <!-- Step 2: Upload Documents -->
            <v-window-item :value="2">
              <OnboardingStep2
                ref="step2Ref"
                v-model="step2Data"
              />
            </v-window-item>
  
            <!-- Step 3: Upload Certifications -->
            <v-window-item :value="3">
              <OnboardingStep3
                ref="step3Ref"
                v-model="step3Data"
                :selected-activities="step1Data.selectedActivities"
              />
            </v-window-item>
          </v-window>
  
          <!-- Navigation Buttons -->
          <v-divider class="my-6" />
  
          <div class="d-flex justify-space-between align-center">
            <v-btn
              v-if="currentStep > 1"
              variant="text"
              prepend-icon="mdi-arrow-left"
              :disabled="loading"
              @click="goBack"
            >
              Back
            </v-btn>
            <v-spacer v-else />
  
            <v-btn
              v-if="currentStep < 3"
              color="primary"
              append-icon="mdi-arrow-right"
              :disabled="!canProceed"
              :loading="loading"
              size="large"
              @click="goNext"
            >
              Next
            </v-btn>
  
            <v-btn
              v-else
              color="success"
              prepend-icon="mdi-check-circle"
              :disabled="!canProceed"
              :loading="loading"
              size="large"
              @click="handleSubmit"
            >
              Submit
            </v-btn>
          </div>
        </v-card>
      </template>
    </div>
  </template>
  
  <style scoped>
  .onboarding-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 16px;
  }
  
  @media (max-width: 600px) {
    .onboarding-container {
      padding: 16px 8px;
    }
  }
  
  /* Stepper customization */
  :deep(.v-stepper-header) {
    box-shadow: none;
  }
  
  :deep(.v-stepper-item__avatar) {
    font-weight: 600;
  }
  </style>