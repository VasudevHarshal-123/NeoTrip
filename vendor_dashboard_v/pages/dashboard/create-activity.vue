<!-- File: pages/dashboard/create-activity.vue -->
<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import ActivityBasics from '~/components/activity/ActivityBasics.vue'
  import ActivitySchedule from '~/components/activity/ActivitySchedule.vue'
  import ActivityPricing from '~/components/activity/ActivityPricing.vue'
  import ActivityMediaLocation from '~/components/activity/ActivityMediaLocation.vue'
  
  definePageMeta({
    layout: 'dashboard',
    middleware: ['auth-global-client']
  })
  
  const router = useRouter()
  const route = useRoute()
  const supabase = useSupabase()
  
  console.log('🔵 Create Activity: Page initialized')
  
  // Stepper state
  const currentStep = ref(1)
  const loading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  
  // Check if duplicating existing activity
  const duplicateId = computed(() => route.query.duplicate)
  const isDuplicating = computed(() => !!duplicateId.value)
  
  // Step component refs
  const step1Ref = ref(null)
  const step2Ref = ref(null)
  const step3Ref = ref(null)
  const step4Ref = ref(null)
  
  // Form data for each step
  const step1Data = ref({
    activityId: null, // from activities_master
    activityName: '',
    durationType: 'slot', // slot, single_day, multi_day
    title: '',
    description: '',
    minAge: null,
    maxAge: null,
    activityStartDate: null,
    activityEndDate: null
  })
  
  const step2Data = ref({
    // Slot-based
    slotStartTime: '09:00',
    slotEndTime: '18:00',
    slotDuration: 120, // minutes
    capacityPerSlot: 10,
    
    // Single day
    capacityPerDay: 10,
    
    // Multi-day
    numberOfDays: 1,
    itinerary: [], // [{ day: 1, title: '', description: '' }]
    capacityPerBatch: 10,
    recurringEnabled: false,
    recurringDays: 'any_day' // 'any_day' or ['monday', 'wednesday']
  })
  
  const step3Data = ref({
    basePrice: null,
    surcharges: [], // [{ dates: [], multiplier: 1.5, label: 'Weekend' }]
    closedDates: [], // [{ date: '2025-01-01', slots: ['09:00-11:00'], reason: 'Holiday' }]
  })
  
  const step4Data = ref({
    images: [], // [{ file, preview, uploaded: false, url: '' }]
    city: '',
    state: '',
    pickupPoints: [], // [{ name: '', address: '' }]
    inclusions: [],
    exclusions: [],
    requirements: {
      fitness: false,
      swimming: false,
      noHeights: false,
      other: ''
    }
  })
  
  // Listing ID (created after step 1)
  const listingId = ref(null)
  const draftStatus = ref('new') // new, draft, pending, approved
  
  // Step definitions
  const steps = [
    { title: 'Basics', value: 1, icon: 'mdi-information' },
    { title: 'Schedule', value: 2, icon: 'mdi-calendar-clock' },
    { title: 'Pricing', value: 3, icon: 'mdi-currency-inr' },
    { title: 'Media & Publish', value: 4, icon: 'mdi-image-multiple' }
  ]
  
  // Validation
  const canProceed = computed(() => {
    if (currentStep.value === 1) return step1Ref.value?.isValid
    if (currentStep.value === 2) return step2Ref.value?.isValid
    if (currentStep.value === 3) return step3Ref.value?.isValid
    if (currentStep.value === 4) return step4Ref.value?.isValid
    return false
  })
  
  // Load duplicate data if applicable
  onMounted(async () => {
    console.log('🔵 Create Activity: onMounted, duplicate ID:', duplicateId.value)
    
    if (isDuplicating.value) {
      await loadDuplicateActivity()
    }
  })
  
  const loadDuplicateActivity = async () => {
    loading.value = true
    console.log('🔍 Loading activity for duplication:', duplicateId.value)
    
    try {
      const { data: listing, error } = await supabase
        .from('activity_listings')
        .select(`
          *,
          activity_schedules (*),
          activity_time_slots (*),
          activity_pricing (*),
          activity_availability (*)
        `)
        .eq('id', duplicateId.value)
        .single()
  
      if (error) throw error
      
      console.log('📊 Loaded activity data:', listing)
      
      // Pre-fill Step 1
      step1Data.value = {
        activityId: listing.activity_id,
        activityName: '', // Will be loaded from activities_master
        durationType: listing.duration_type,
        title: `${listing.title} - Copy`,
        description: listing.description,
        minAge: listing.min_age,
        maxAge: listing.max_age,
        activityStartDate: null, // Reset to future
        activityEndDate: null
      }
      
      // Pre-fill Step 2 based on duration type
      if (listing.duration_type === 'slot' && listing.activity_time_slots?.length > 0) {
        const firstSlot = listing.activity_time_slots[0]
        step2Data.value.slotStartTime = firstSlot.start_time
        step2Data.value.slotEndTime = firstSlot.end_time
        step2Data.value.capacityPerSlot = firstSlot.max_capacity
      }
      
      if (listing.duration_type === 'multi_day') {
        step2Data.value.numberOfDays = listing.duration_value
        step2Data.value.itinerary = listing.inclusions?.itinerary || []
        step2Data.value.recurringEnabled = listing.recurring_batch_enabled
        step2Data.value.recurringDays = listing.recurring_batch_days
      }
      
      // Pre-fill Step 3
      if (listing.activity_pricing?.length > 0) {
        step3Data.value.basePrice = listing.activity_pricing[0].base_price
      }
      
      // Pre-fill Step 4
      step4Data.value.city = listing.city
      step4Data.value.state = listing.state
      step4Data.value.pickupPoints = listing.pickup_points || []
      step4Data.value.inclusions = listing.inclusions?.items || []
      step4Data.value.exclusions = listing.exclusions?.items || []
      
      successMessage.value = 'Activity loaded for duplication. Update dates and submit!'
    } catch (error) {
      console.error('❌ Error loading activity:', error)
      errorMessage.value = 'Failed to load activity for duplication'
    } finally {
      loading.value = false
    }
  }
  
  // Navigation
  const goNext = async () => {
    if (!canProceed.value) {
      console.log('⚠️ Cannot proceed, validation failed')
      return
    }
  
    console.log(`🔵 Moving from Step ${currentStep.value} to Step ${currentStep.value + 1}`)
    errorMessage.value = ''
    successMessage.value = ''
    loading.value = true
  
    try {
      // Save current step
      if (currentStep.value === 1) {
        await saveStep1()
      } else if (currentStep.value === 2) {
        await saveStep2()
      } else if (currentStep.value === 3) {
        await saveStep3()
      }
  
      // Move to next step
      currentStep.value++
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      successMessage.value = `Step ${currentStep.value - 1} saved as draft!`
    } catch (error) {
      console.error('❌ Error saving step:', error)
      errorMessage.value = error.message || 'Failed to save. Please try again.'
    } finally {
      loading.value = false
    }
  }
  
  const goBack = () => {
    if (currentStep.value > 1) {
      console.log(`🔵 Going back from Step ${currentStep.value} to Step ${currentStep.value - 1}`)
      currentStep.value--
      errorMessage.value = ''
      successMessage.value = ''
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  
  // Save Step 1: Create listing
  const saveStep1 = async () => {
    console.log('💾 Saving Step 1 data...', step1Data.value)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
  
    // Get vendor_id
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single()
  
    if (vendorError) throw vendorError
  
    // Get vendor_activity_id
    const { data: vendorActivity, error: vaError } = await supabase
      .from('vendor_activities')
      .select('id')
      .eq('vendor_id', vendor.id)
      .eq('activity_id', step1Data.value.activityId)
      .single()
  
    if (vaError) throw vaError
  
    // Create or update listing
    const listingPayload = {
      vendor_id: vendor.id,
      vendor_activity_id: vendorActivity.id,
      activity_id: step1Data.value.activityId,
      title: step1Data.value.title,
      description: step1Data.value.description,
      duration_type: step1Data.value.durationType,
      min_age: step1Data.value.minAge,
      max_age: step1Data.value.maxAge,
      activity_start_date: step1Data.value.activityStartDate,
      activity_end_date: step1Data.value.activityEndDate,
      status: 'draft'
    }
  
    if (listingId.value) {
      // Update existing
      const { error } = await supabase
        .from('activity_listings')
        .update(listingPayload)
        .eq('id', listingId.value)
  
      if (error) throw error
      console.log('✅ Updated listing:', listingId.value)
    } else {
      // Create new
      const { data, error } = await supabase
        .from('activity_listings')
        .insert(listingPayload)
        .select()
        .single()
  
      if (error) throw error
      listingId.value = data.id
      draftStatus.value = 'draft'
      console.log('✅ Created listing:', listingId.value)
    }
  }
  
  // Save Step 2: Schedule & Capacity
  const saveStep2 = async () => {
    console.log('💾 Saving Step 2 data...', step2Data.value)
    
    if (!listingId.value) throw new Error('No listing ID found')
  
    const durationType = step1Data.value.durationType
  
    // Update listing with duration details
    const durationPayload = {}
    
    if (durationType === 'slot') {
      durationPayload.max_participants_per_slot = step2Data.value.capacityPerSlot
    } else if (durationType === 'single_day') {
      durationPayload.max_participants_per_day = step2Data.value.capacityPerDay
      durationPayload.duration_value = 1
      durationPayload.duration_unit = 'days'
    } else if (durationType === 'multi_day') {
      durationPayload.duration_value = step2Data.value.numberOfDays
      durationPayload.duration_unit = 'days'
      durationPayload.max_participants_per_day = step2Data.value.capacityPerBatch
      durationPayload.recurring_batch_enabled = step2Data.value.recurringEnabled
      durationPayload.recurring_batch_days = step2Data.value.recurringDays
      
      // Store itinerary in inclusions JSONB
      durationPayload.inclusions = {
        itinerary: step2Data.value.itinerary,
        items: step4Data.value.inclusions // Will be merged in step 4
      }
    }
  
    const { error: listingError } = await supabase
      .from('activity_listings')
      .update(durationPayload)
      .eq('id', listingId.value)
  
    if (listingError) throw listingError
  
    // Create schedule entry
    const { data: schedule, error: scheduleError } = await supabase
      .from('activity_schedules')
      .upsert({
        listing_id: listingId.value,
        schedule_type: 'date_range',
        start_date: step1Data.value.activityStartDate,
        end_date: step1Data.value.activityEndDate,
        has_time_slots: durationType === 'slot',
        is_active: true
      }, {
        onConflict: 'listing_id'
      })
      .select()
      .single()
  
    if (scheduleError) throw scheduleError
  
    // If slot-based, create time slots
    if (durationType === 'slot') {
      const slots = generateTimeSlots(
        step2Data.value.slotStartTime,
        step2Data.value.slotEndTime,
        step2Data.value.slotDuration
      )
  
      // Delete existing slots
      await supabase
        .from('activity_time_slots')
        .delete()
        .eq('schedule_id', schedule.id)
  
      // Insert new slots
      const slotInserts = slots.map(slot => ({
        schedule_id: schedule.id,
        listing_id: listingId.value,
        slot_name: slot.name,
        start_time: slot.start,
        end_time: slot.end,
        max_capacity: step2Data.value.capacityPerSlot,
        is_active: true
      }))
  
      const { error: slotsError } = await supabase
        .from('activity_time_slots')
        .insert(slotInserts)
  
      if (slotsError) throw slotsError
      console.log(`✅ Created ${slots.length} time slots`)
    }
  
    console.log('✅ Step 2 saved')
  }
  
  // Helper: Generate time slots
  const generateTimeSlots = (startTime, endTime, durationMinutes) => {
    const slots = []
    let current = parseTime(startTime)
    const end = parseTime(endTime)
  
    while (current < end) {
      const slotEnd = current + durationMinutes
      if (slotEnd > end) break
  
      slots.push({
        name: `${formatTime(current)} - ${formatTime(slotEnd)}`,
        start: formatTime(current),
        end: formatTime(slotEnd)
      })
  
      current = slotEnd
    }
  
    return slots
  }
  
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }
  
  // Save Step 3: Pricing & Exceptions
  const saveStep3 = async () => {
    console.log('💾 Saving Step 3 data...', step3Data.value)
    
    if (!listingId.value) throw new Error('No listing ID found')
  
    // Create/update pricing
    const { error: pricingError } = await supabase
      .from('activity_pricing')
      .upsert({
        listing_id: listingId.value,
        base_price: step3Data.value.basePrice,
        currency: 'INR',
        is_active: true
      }, {
        onConflict: 'listing_id'
      })
  
    if (pricingError) throw pricingError
  
    // Handle surcharges (custom prices on specific dates)
    for (const surcharge of step3Data.value.surcharges) {
      for (const date of surcharge.dates) {
        const customPrice = step3Data.value.basePrice * surcharge.multiplier
  
        await supabase
          .from('activity_availability')
          .upsert({
            listing_id: listingId.value,
            availability_date: date,
            override_type: 'custom_price',
            custom_price: customPrice,
            reason: surcharge.label
          }, {
            onConflict: 'listing_id,availability_date,time_slot_id'
          })
      }
    }
  
    // Handle closed dates
    for (const closure of step3Data.value.closedDates) {
      await supabase
        .from('activity_availability')
        .upsert({
          listing_id: listingId.value,
          availability_date: closure.date,
          override_type: 'unavailable',
          reason: closure.reason || 'Closed by vendor'
        }, {
          onConflict: 'listing_id,availability_date,time_slot_id'
        })
    }
  
    console.log('✅ Step 3 saved')
  }
  
  // Save Step 4 & Submit
// Save Step 4 & Submit
const handleSubmit = async (publishNow = false) => {
  if (!canProceed.value) {
    console.log('⚠️ Cannot submit, validation failed')
    return
  }

  console.log('💾 Submitting final step, publish:', publishNow)
  loading.value = true
  errorMessage.value = ''

  try {
    if (!listingId.value) throw new Error('No listing ID found')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Upload images
    const uploadedImages = []
    for (const img of step4Data.value.images) {
      if (img.uploaded && img.url) {
        uploadedImages.push(img.url)
        continue
      }

      const timestamp = Date.now()
      const ext = img.file.name.split('.').pop()
      const path = `${user.id}/listing_${listingId.value}_${timestamp}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('vendor-documents')
        .upload(path, img.file)

      if (uploadError) throw uploadError

      uploadedImages.push(path)
    }

    // Update listing with final data
    const finalPayload = {
      images: uploadedImages,
      city: step4Data.value.city,
      state: step4Data.value.state,
      country: 'India',
      timezone: 'Asia/Kolkata',
      pickup_points: step4Data.value.pickupPoints.filter(p => p.name && p.address),
      inclusions: {
        items: step4Data.value.inclusions,
        itinerary: step2Data.value.itinerary // Merge itinerary from step 2
      },
      exclusions: {
        items: step4Data.value.exclusions
      },
      requirements: step4Data.value.requirements,
      
      // KEY CHANGE: Update status based on action
      status: publishNow ? 'pending' : 'draft',
      is_published: false // Admin will set this to true after approval
    }

    console.log('💾 Final payload:', finalPayload)

    const { error } = await supabase
      .from('activity_listings')
      .update(finalPayload)
      .eq('id', listingId.value)

    if (error) throw error

    console.log('✅ Activity saved successfully!')
    
    if (publishNow) {
      successMessage.value = 'Activity submitted for approval! Admin will review your listing.'
    } else {
      successMessage.value = 'Activity saved as draft! You can continue editing anytime.'
    }

    // Redirect after 2 seconds
    setTimeout(() => {
      router.push('/dashboard/activities')
    }, 2000)

  } catch (error) {
    console.error('❌ Error submitting activity:', error)
    errorMessage.value = error.message || 'Failed to submit activity'
  } finally {
    loading.value = false
  }
}
  </script>
  
  <template>
    <div class="create-activity-container">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">
          {{ isDuplicating ? 'Duplicate Activity' : 'Create New Activity' }}
        </h1>
        <p class="text-body-1 text-medium-emphasis">
          Fill in the details to create your adventure activity listing
        </p>
      </div>
  
      <!-- Alert Messages -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        closable
        class="mb-4"
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>
  
      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        closable
        class="mb-4"
        @click:close="successMessage = ''"
      >
        {{ successMessage }}
      </v-alert>
  
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
              <template #icon>
                <v-icon>{{ step.icon }}</v-icon>
              </template>
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
          <!-- Step 1: Basics -->
          <v-window-item :value="1">
            <ActivityBasics
              ref="step1Ref"
              v-model="step1Data"
            />
          </v-window-item>
  
          <!-- Step 2: Schedule -->
          <v-window-item :value="2">
            <ActivitySchedule
              ref="step2Ref"
              v-model="step2Data"
              :duration-type="step1Data.durationType"
              :start-date="step1Data.activityStartDate"
              :end-date="step1Data.activityEndDate"
            />
          </v-window-item>
  
          <!-- Step 3: Pricing -->
          <v-window-item :value="3">
            <ActivityPricing
              ref="step3Ref"
              v-model="step3Data"
              :duration-type="step1Data.durationType"
              :start-date="step1Data.activityStartDate"
              :end-date="step1Data.activityEndDate"
              :time-slots="step2Data.generatedSlots || []"
            />
          </v-window-item>
  
          <!-- Step 4: Media & Location -->
          <v-window-item :value="4">
            <ActivityMediaLocation
              ref="step4Ref"
              v-model="step4Data"
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
  
          <div class="d-flex gap-2">
            <!-- Save as Draft (all steps) -->
            <v-btn
              v-if="currentStep === 4"
              variant="outlined"
              color="primary"
              :disabled="!canProceed"
              :loading="loading"
              @click="handleSubmit(false)"
            >
              Save as Draft
            </v-btn>
  
            <!-- Next Button (Steps 1-3) -->
            <v-btn
              v-if="currentStep < 4"
              color="primary"
              append-icon="mdi-arrow-right"
              :disabled="!canProceed"
              :loading="loading"
              size="large"
              @click="goNext"
            >
              Next
            </v-btn>
  
            <!-- Submit for Approval (Step 4) -->
            <v-btn
              v-if="currentStep === 4"
              color="success"
              prepend-icon="mdi-check-circle"
              :disabled="!canProceed"
              :loading="loading"
              size="large"
              @click="handleSubmit(true)"
            >
              Submit for Approval
            </v-btn>
          </div>
        </div>
      </v-card>
    </div>
  </template>
  
  <style scoped>
  .create-activity-container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  :deep(.v-stepper-header) {
    box-shadow: none;
  }
  </style>