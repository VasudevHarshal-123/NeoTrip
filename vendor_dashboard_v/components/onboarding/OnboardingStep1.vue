<!-- 
  File: components/onboarding/OnboardingStep1.vue
  Path: components/onboarding/OnboardingStep1.vue
  Description: Step 1 - Basic Information (Name, Phone, Company, Activities)
-->

<script setup>
    import { ref, computed } from 'vue'
    import { ACTIVITIES } from '~/constants/activities'
    
    // Props
    const props = defineProps({
      modelValue: {
        type: Object,
        default: () => ({
          fullName: '',
          phoneNumber: '',
          companyName: '',
          selectedActivities: []
        })
      }
    })
    
    // Emits
    const emit = defineEmits(['update:modelValue'])
    
    // Local state (synced with parent)
    const formData = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })
    
    // Validation rules
    const nameRules = [
      v => !!v || 'Name is required',
      v => v.length >= 3 || 'Name must be at least 3 characters'
    ]
    
    const phoneRules = [
      v => !!v || 'Phone number is required',
      v => /^[6-9]\d{9}$/.test(v) || 'Enter valid 10-digit Indian mobile number'
    ]
    
    const companyRules = [
      v => !!v || 'Company name is required',
      v => v.length >= 2 || 'Company name must be at least 2 characters'
    ]
    
    const activitiesRules = [
      v => v.length > 0 || 'Select at least one activity'
    ]
    
    // Form validation
    const isValid = computed(() => {
      return formData.value.fullName?.length >= 3 &&
             /^[6-9]\d{9}$/.test(formData.value.phoneNumber) &&
             formData.value.companyName?.length >= 2 &&
             formData.value.selectedActivities.length > 0
    })
    
    // Expose validation status to parent
    defineExpose({ isValid })
    </script>
    
    <template>
      <div class="onboarding-step">
        <!-- Header -->
        <div class="mb-8 text-center">
          <h2 class="text-h4 font-weight-bold mb-2">Basic Information</h2>
          <p class="text-body-1 text-medium-emphasis">
            Tell us about yourself to get started.
          </p>
        </div>
    
        <!-- Form Fields -->
        <v-row>
          <!-- Full Name -->
          <v-col cols="12">
            <v-text-field
              v-model="formData.fullName"
              label="Full Name"
              placeholder="Enter your full name"
              variant="outlined"
              prepend-inner-icon="mdi-account-outline"
              :rules="nameRules"
              required
              density="comfortable"
            />
          </v-col>
    
          <!-- Phone Number -->
          <v-col cols="12">
            <v-text-field
              v-model="formData.phoneNumber"
              label="Phone Number"
              placeholder="Enter your phone number"
              variant="outlined"
              prepend-inner-icon="mdi-phone-outline"
              :rules="phoneRules"
              type="tel"
              maxlength="10"
              required
              density="comfortable"
            />
          </v-col>
    
          <!-- Company Name -->
          <v-col cols="12">
            <v-text-field
              v-model="formData.companyName"
              label="Company Name"
              placeholder="Enter your company/business name"
              variant="outlined"
              prepend-inner-icon="mdi-domain"
              :rules="companyRules"
              required
              density="comfortable"
            />
          </v-col>
    
          <!-- Services You Provide (v-autocomplete with chips) -->
          <v-col cols="12">
            <v-autocomplete
              v-model="formData.selectedActivities"
              :items="ACTIVITIES"
              label="Services You Provide"
              placeholder="Search and select activities"
              variant="outlined"
              prepend-inner-icon="mdi-briefcase-outline"
              :rules="activitiesRules"
              multiple
              chips
              closable-chips
              required
              density="comfortable"
              hint="Select all activities your business offers"
              persistent-hint
            >
              <template #chip="{ props: chipProps, item }">
                <v-chip
                  v-bind="chipProps"
                  :text="item.raw"
                  size="default"
                  closable
                  color="primary"
                  variant="flat"
                />
              </template>
              
              <template #item="{ props: itemProps, item }">
                <v-list-item
                  v-bind="itemProps"
                  :title="item.raw"
                  density="comfortable"
                />
              </template>
            </v-autocomplete>
          </v-col>
        </v-row>
      </div>
    </template>
    
    <style scoped>
    .onboarding-step {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    
    @media (max-width: 600px) {
      .onboarding-step {
        padding: 16px 8px;
      }
    }
    </style>