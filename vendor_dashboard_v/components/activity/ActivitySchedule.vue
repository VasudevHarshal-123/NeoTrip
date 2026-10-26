<!-- File: components/activity/ActivitySchedule.vue -->
<script setup>
    import { ref, computed, watch } from 'vue'
    
    const props = defineProps({
      modelValue: {
        type: Object,
        required: true
      },
      durationType: {
        type: String,
        required: true
      },
      startDate: {
        type: String,
        default: null
      },
      endDate: {
        type: String,
        default: null
      }
    })
    
    const emit = defineEmits(['update:modelValue'])
    
    const formData = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })
    
    // Slot duration options (in minutes)
    const slotDurationOptions = [
      { title: '30 minutes', value: 30 },
      { title: '1 hour', value: 60 },
      { title: '1.5 hours', value: 90 },
      { title: '2 hours', value: 120 },
      { title: '3 hours', value: 180 },
      { title: '4 hours', value: 240 },
      { title: '6 hours', value: 360 },
      { title: '8 hours', value: 480 }
    ]
    
    // Auto-generate slots preview
    const generatedSlots = computed(() => {
      if (props.durationType !== 'slot') return []
      
      const start = parseTime(formData.value.slotStartTime)
      const end = parseTime(formData.value.slotEndTime)
      const duration = formData.value.slotDuration
    
      if (!start || !end || !duration || start >= end) return []
    
      const slots = []
      let current = start
    
      while (current < end) {
        const slotEnd = current + duration
        if (slotEnd > end) break
    
        slots.push({
          name: `${formatTime(current)} - ${formatTime(slotEnd)}`,
          start: formatTime(current),
          end: formatTime(slotEnd),
          capacity: formData.value.capacityPerSlot
        })
    
        current = slotEnd
      }
    
      return slots
    })
    
    const parseTime = (timeStr) => {
      if (!timeStr) return null
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    }
    
    // Multi-day itinerary management
    const addItineraryDay = () => {
      const dayNum = formData.value.itinerary.length + 1
      formData.value.itinerary.push({
        day: dayNum,
        title: `Day ${dayNum}`,
        description: ''
      })
    }
    
    const removeItineraryDay = (index) => {
      formData.value.itinerary.splice(index, 1)
      // Renumber days
      formData.value.itinerary.forEach((day, idx) => {
        day.day = idx + 1
      })
    }
    
    // Watch numberOfDays to auto-generate itinerary
    watch(() => formData.value.numberOfDays, (newDays) => {
      if (props.durationType === 'multi_day') {
        const currentDays = formData.value.itinerary.length
        
        if (newDays > currentDays) {
          // Add missing days
          for (let i = currentDays + 1; i <= newDays; i++) {
            formData.value.itinerary.push({
              day: i,
              title: `Day ${i}`,
              description: ''
            })
          }
        } else if (newDays < currentDays) {
          // Remove extra days
          formData.value.itinerary = formData.value.itinerary.slice(0, newDays)
        }
      }
    })
    
    // Days of week for recurring batches
    const daysOfWeek = [
      { title: 'Monday', value: 'monday' },
      { title: 'Tuesday', value: 'tuesday' },
      { title: 'Wednesday', value: 'wednesday' },
      { title: 'Thursday', value: 'thursday' },
      { title: 'Friday', value: 'friday' },
      { title: 'Saturday', value: 'saturday' },
      { title: 'Sunday', value: 'sunday' }
    ]
    
    const selectedDays = ref([])
    
    watch(() => formData.value.recurringDays, (newValue) => {
      if (Array.isArray(newValue)) {
        selectedDays.value = newValue
      }
    })
    
    watch(selectedDays, (newDays) => {
      if (newDays.length > 0) {
        formData.value.recurringDays = newDays
      }
    })
    
    // Validation
    const isValid = computed(() => {
      if (props.durationType === 'slot') {
        return !!(
          formData.value.slotStartTime &&
          formData.value.slotEndTime &&
          formData.value.slotDuration &&
          formData.value.capacityPerSlot > 0 &&
          generatedSlots.value.length > 0
        )
      } else if (props.durationType === 'single_day') {
        return formData.value.capacityPerDay > 0
      } else if (props.durationType === 'multi_day') {
        return !!(
          formData.value.numberOfDays >= 1 &&
          formData.value.capacityPerBatch > 0 &&
          formData.value.itinerary.length === formData.value.numberOfDays &&
          formData.value.itinerary.every(day => day.title && day.description)
        )
      }
      return false
    })
    
    defineExpose({ isValid })
    </script>
    
    <template>
      <div class="activity-schedule">
        <h2 class="text-h5 font-weight-bold mb-4">Schedule & Capacity</h2>
    
        <!-- SLOT-BASED CONFIGURATION -->
        <template v-if="durationType === 'slot'">
          <p class="text-body-2 text-medium-emphasis mb-6">
            Configure time slots for your activity
          </p>
    
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.slotStartTime"
                label="Operating Start Time *"
                type="time"
                variant="outlined"
                prepend-inner-icon="mdi-clock-start"
                :rules="[v => !!v || 'Start time is required']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.slotEndTime"
                label="Operating End Time *"
                type="time"
                variant="outlined"
                prepend-inner-icon="mdi-clock-end"
                :rules="[v => !!v || 'End time is required']"
              />
            </v-col>
          </v-row>
    
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.slotDuration"
                :items="slotDurationOptions"
                label="Slot Duration *"
                variant="outlined"
                prepend-inner-icon="mdi-timer"
                :rules="[v => !!v || 'Duration is required']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.capacityPerSlot"
                label="Capacity Per Slot *"
                type="number"
                variant="outlined"
                :min="1"
                :max="1000"
                prepend-inner-icon="mdi-account-group"
                :rules="[v => v > 0 || 'Capacity must be at least 1']"
                hint="Maximum participants per time slot"
              />
            </v-col>
          </v-row>
    
          <!-- Slots Preview -->
          <v-card v-if="generatedSlots.length > 0" variant="tonal" color="success" class="pa-4 mb-4">
            <div class="text-subtitle-2 font-weight-medium mb-3">
              <v-icon class="mr-2">mdi-check-circle</v-icon>
              Generated Time Slots ({{ generatedSlots.length }} slots)
            </div>
            <v-chip-group column>
              <v-chip v-for="slot in generatedSlots" :key="slot.name" color="success">
                {{ slot.name }} ({{ slot.capacity }} people)
              </v-chip>
            </v-chip-group>
          </v-card>
    
          <v-alert v-else type="warning" variant="tonal">
            No slots generated. Please check your time range and duration.
          </v-alert>
        </template>
    
        <!-- SINGLE DAY CONFIGURATION -->
        <template v-else-if="durationType === 'single_day'">
          <p class="text-body-2 text-medium-emphasis mb-6">
            Set the daily capacity for your full-day activity
          </p>
    
          <v-text-field
            v-model.number="formData.capacityPerDay"
            label="Daily Capacity *"
            type="number"
            variant="outlined"
            :min="1"
            :max="1000"
            prepend-inner-icon="mdi-account-group"
            :rules="[v => v > 0 || 'Capacity must be at least 1']"
            hint="Maximum participants per day"
            class="mb-4"
          />
    
          <v-card variant="tonal" color="info" class="pa-4">
            <div class="d-flex align-start">
              <v-icon class="mr-3">mdi-information</v-icon>
              <div class="text-caption">
                This is a full-day activity without specific time slots. 
                Participants can book any day within your date range.
              </div>
            </div>
          </v-card>
        </template>
    
        <!-- MULTI-DAY CONFIGURATION -->
        <template v-else-if="durationType === 'multi_day'">
          <p class="text-body-2 text-medium-emphasis mb-6">
            Configure your multi-day adventure with day-by-day itinerary
          </p>
    
          <v-row class="mb-6">
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.numberOfDays"
                label="Number of Days *"
                type="number"
                variant="outlined"
                :min="1"
                :max="30"
                prepend-inner-icon="mdi-calendar-multiple"
                :rules="[v => v >= 1 || 'At least 1 day required']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.capacityPerBatch"
                label="Capacity Per Batch *"
                type="number"
                variant="outlined"
                :min="1"
                :max="1000"
                prepend-inner-icon="mdi-account-group"
                :rules="[v => v > 0 || 'Capacity must be at least 1']"
                hint="Maximum participants per batch"
              />
            </v-col>
          </v-row>
    
          <!-- Recurring Batch Configuration -->
          <v-card variant="outlined" class="pa-4 mb-6">
            <div class="text-subtitle-2 font-weight-medium mb-3">Recurring Batches</div>
            
            <v-switch
              v-model="formData.recurringEnabled"
              label="Allow participants to join on any day"
              color="primary"
              inset
              hint="If enabled, batches can start on any day (overlapping batches). If disabled, select specific days."
              persistent-hint
              class="mb-4"
            />
    
            <v-expand-transition>
              <div v-if="formData.recurringEnabled">
                <v-radio-group v-model="formData.recurringDays" inline>
                  <v-radio label="Any day" value="any_day" />
                  <v-radio label="Specific days only" :value="[]" />
                </v-radio-group>
    
                <v-expand-transition>
                  <v-chip-group
                    v-if="Array.isArray(formData.recurringDays)"
                    v-model="selectedDays"
                    multiple
                    column
                    class="mt-2"
                  >
                    <v-chip
                      v-for="day in daysOfWeek"
                      :key="day.value"
                      :value="day.value"
                      filter
                      variant="outlined"
                    >
                      {{ day.title }}
                    </v-chip>
                  </v-chip-group>
                </v-expand-transition>
              </div>
            </v-expand-transition>
    
            <v-alert type="info" variant="tonal" class="mt-4">
              <div class="text-caption">
                <strong>Recurring enabled:</strong> A new {{ formData.numberOfDays }}-day batch can start 
                {{ formData.recurringDays === 'any_day' ? 'every day' : 'on selected days' }}.
                <br>
                <strong>Recurring disabled:</strong> Batches are independent (no overlapping).
              </div>
            </v-alert>
          </v-card>
    
          <!-- Day-by-Day Itinerary -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="text-subtitle-2 font-weight-medium">Day-by-Day Itinerary *</div>
            </div>
    
            <v-expansion-panels v-if="formData.itinerary.length > 0">
              <v-expansion-panel
                v-for="(day, index) in formData.itinerary"
                :key="index"
                elevation="0"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center">
                    <v-chip color="primary" size="small" class="mr-3">Day {{ day.day }}</v-chip>
                    <span class="font-weight-medium">{{ day.title || 'Untitled' }}</span>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-text-field
                    v-model="day.title"
                    label="Day Title *"
                    variant="outlined"
                    placeholder="e.g., Base Camp Trek"
                    class="mb-3"
                    :rules="[v => !!v || 'Title is required']"
                  />
                  <v-textarea
                    v-model="day.description"
                    label="Day Description *"
                    variant="outlined"
                    placeholder="Describe what happens on this day..."
                    rows="4"
                    :rules="[v => !!v || 'Description is required']"
                  />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
    
            <v-alert v-else type="warning" variant="tonal">
              No itinerary days added yet. Set the number of days above.
            </v-alert>
          </div>
        </template>
      </div>
    </template>
    
    <style scoped>
    .activity-schedule {
      max-width: 900px;
      margin: 0 auto;
    }
    </style>