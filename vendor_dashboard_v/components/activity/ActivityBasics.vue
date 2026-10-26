<!-- File: components/activity/ActivityBasics.vue -->
<script setup>
    import { ref, computed, watch, onMounted } from 'vue'
    
    const props = defineProps({
      modelValue: {
        type: Object,
        required: true
      }
    })
    
    const emit = defineEmits(['update:modelValue'])
    
    const supabase = useSupabase()
    
    // Local state
    const formData = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })
    
    const activities = ref([])
    const loadingActivities = ref(false)
    const selectedActivity = ref(null)
    
    // Duration type options
    const durationTypes = [
      { value: 'slot', title: 'Time Slot Based', description: 'Activity runs in specific time slots (e.g., 9 AM, 2 PM)' },
      { value: 'single_day', title: 'Single Day', description: 'Full day activity without specific time slots' },
      { value: 'multi_day', title: 'Multi-Day', description: 'Activity spans multiple consecutive days' }
    ]
    
    // Load activities from database
    onMounted(async () => {
      loadingActivities.value = true
      try {
        const { data, error } = await supabase
          .from('activities_master')
          .select('id, name, category, default_min_age, default_max_age')
          .eq('is_active', true)
          .order('name')
    
        if (error) throw error
        activities.value = data
        console.log('✅ Loaded', data.length, 'activities')
      } catch (error) {
        console.error('❌ Error loading activities:', error)
      } finally {
        loadingActivities.value = false
      }
    })
    
    // Watch activity selection to pre-fill age restrictions
    watch(() => formData.value.activityId, (newActivityId) => {
      if (newActivityId) {
        const activity = activities.value.find(a => a.id === newActivityId)
        if (activity) {
          selectedActivity.value = activity
          formData.value.activityName = activity.name
          
          // Pre-fill age restrictions from master
          if (!formData.value.minAge && activity.default_min_age) {
            formData.value.minAge = activity.default_min_age
          }
          if (!formData.value.maxAge && activity.default_max_age) {
            formData.value.maxAge = activity.default_max_age
          }
          
          console.log('✅ Selected activity:', activity.name)
        }
      }
    })
    
    // Validation rules
    const titleRules = [
      v => !!v || 'Title is required',
      v => (v && v.length >= 10) || 'Title must be at least 10 characters',
      v => (v && v.length <= 200) || 'Title must be less than 200 characters'
    ]
    
    const descriptionRules = [
      v => !!v || 'Description is required',
      v => (v && v.length >= 50) || 'Description must be at least 50 characters'
    ]
    
    const dateRules = [
      v => !!v || 'Date is required'
    ]
    
    // Validate date range (max 30 days)
    const dateRangeError = computed(() => {
      if (!formData.value.activityStartDate || !formData.value.activityEndDate) {
        return null
      }
    
      const start = new Date(formData.value.activityStartDate)
      const end = new Date(formData.value.activityEndDate)
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    
      if (diffDays < 0) {
        return 'End date must be after start date'
      }
      if (diffDays > 30) {
        return 'Activity duration cannot exceed 30 days'
      }
      return null
    })
    
    // Auto-set end date (30 days from start if not set)
    watch(() => formData.value.activityStartDate, (newStartDate) => {
      if (newStartDate && !formData.value.activityEndDate) {
        const start = new Date(newStartDate)
        const end = new Date(start)
        end.setDate(end.getDate() + 30)
        formData.value.activityEndDate = end.toISOString().split('T')[0]
      }
    })
    
    // Validation
    const isValid = computed(() => {
      return !!(
        formData.value.activityId &&
        formData.value.durationType &&
        formData.value.title?.length >= 10 &&
        formData.value.title?.length <= 200 &&
        formData.value.description?.length >= 50 &&
        formData.value.activityStartDate &&
        formData.value.activityEndDate &&
        !dateRangeError.value
      )
    })
    
    defineExpose({ isValid })
    </script>
    
    <template>
      <div class="activity-basics">
        <h2 class="text-h5 font-weight-bold mb-4">Activity Basics</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Select the activity type and provide basic details
        </p>
    
        <!-- Activity Selection -->
        <v-autocomplete
          v-model="formData.activityId"
          :items="activities"
          item-title="name"
          item-value="id"
          label="Select Activity *"
          placeholder="Search for an activity..."
          :loading="loadingActivities"
          :rules="[v => !!v || 'Activity selection is required']"
          variant="outlined"
          class="mb-4"
          prepend-inner-icon="mdi-hiking"
          clearable
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #prepend>
                <v-icon 
                  :color="item.raw.category === 'air' ? 'blue' : 
                         item.raw.category === 'water' ? 'cyan' : 
                         item.raw.category === 'land' ? 'green' : 
                         item.raw.category === 'snow' ? 'light-blue' : 'orange'"
                >
                  mdi-{{ item.raw.category === 'air' ? 'airplane' : 
                         item.raw.category === 'water' ? 'waves' : 
                         item.raw.category === 'land' ? 'terrain' : 
                         item.raw.category === 'snow' ? 'snowflake' : 'leaf' }}
                </v-icon>
              </template>
              <v-list-item-subtitle>
                {{ item.raw.category.toUpperCase() }}
              </v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-autocomplete>
    
        <!-- Duration Type -->
        <div class="mb-6">
          <label class="text-subtitle-2 font-weight-medium mb-2 d-block">Duration Type *</label>
          <v-radio-group
            v-model="formData.durationType"
            :rules="[v => !!v || 'Duration type is required']"
            inline
          >
            <v-card
              v-for="type in durationTypes"
              :key="type.value"
              :variant="formData.durationType === type.value ? 'tonal' : 'outlined'"
              :color="formData.durationType === type.value ? 'primary' : ''"
              class="pa-4 mb-3"
              style="cursor: pointer;"
              @click="formData.durationType = type.value"
            >
              <div class="d-flex align-center">
                <v-radio :value="type.value" />
                <div class="ml-2">
                  <div class="text-subtitle-1 font-weight-medium">{{ type.title }}</div>
                  <div class="text-caption text-medium-emphasis">{{ type.description }}</div>
                </div>
              </div>
            </v-card>
          </v-radio-group>
        </div>
    
        <!-- Listing Title -->
        <v-text-field
          v-model="formData.title"
          label="Activity Listing Title *"
          placeholder="e.g., Thrilling Paragliding Experience in Bir Billing"
          variant="outlined"
          :rules="titleRules"
          counter="200"
          class="mb-4"
          prepend-inner-icon="mdi-format-title"
          hint="This will be shown to customers"
        />
    
        <!-- Description -->
        <v-textarea
          v-model="formData.description"
          label="Activity Description *"
          placeholder="Describe your activity in detail. Include what makes it special, what to expect, safety measures, etc."
          variant="outlined"
          :rules="descriptionRules"
          counter
          rows="6"
          class="mb-4"
          prepend-inner-icon="mdi-text"
          hint="Minimum 50 characters"
        />
    
        <!-- Date Range -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.activityStartDate"
              label="Activity Start Date *"
              type="date"
              variant="outlined"
              :rules="dateRules"
              :min="new Date().toISOString().split('T')[0]"
              prepend-inner-icon="mdi-calendar-start"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.activityEndDate"
              label="Activity End Date *"
              type="date"
              variant="outlined"
              :rules="dateRules"
              :min="formData.activityStartDate"
              :error-messages="dateRangeError ? [dateRangeError] : []"
              prepend-inner-icon="mdi-calendar-end"
            />
          </v-col>
        </v-row>
    
        <v-alert v-if="dateRangeError" type="error" variant="tonal" class="mb-4">
          {{ dateRangeError }}
        </v-alert>
    
        <v-alert v-else-if="formData.activityStartDate && formData.activityEndDate" type="info" variant="tonal" class="mb-4">
          Duration: {{ Math.ceil((new Date(formData.activityEndDate) - new Date(formData.activityStartDate)) / (1000 * 60 * 60 * 24)) }} days
          (Max: 30 days per listing)
        </v-alert>
    
        <!-- Age Restrictions -->
        <div class="mb-4">
          <label class="text-subtitle-2 font-weight-medium mb-2 d-block">Age Restrictions (Optional)</label>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.minAge"
                label="Minimum Age"
                type="number"
                variant="outlined"
                :min="0"
                :max="100"
                prepend-inner-icon="mdi-account-child"
                hint="Leave blank for no minimum age"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.maxAge"
                label="Maximum Age"
                type="number"
                variant="outlined"
                :min="formData.minAge || 0"
                :max="150"
                prepend-inner-icon="mdi-account"
                hint="Leave blank for no maximum age"
              />
            </v-col>
          </v-row>
        </div>
    
        <!-- Info Card -->
        <v-card variant="tonal" color="info" class="pa-4">
          <div class="d-flex align-start">
            <v-icon size="24" class="mr-3">mdi-information</v-icon>
            <div>
              <div class="text-subtitle-2 font-weight-medium mb-1">Quick Tips</div>
              <ul class="text-caption text-medium-emphasis">
                <li>Choose a clear, descriptive title that attracts customers</li>
                <li>Provide detailed description about what's included and what to expect</li>
                <li>You can create activities for a maximum of 30 days at a time</li>
                <li>Age restrictions help set customer expectations</li>
              </ul>
            </div>
          </div>
        </v-card>
      </div>
    </template>
    
    <style scoped>
    .activity-basics {
      max-width: 800px;
      margin: 0 auto;
    }
    </style>