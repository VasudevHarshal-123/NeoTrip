<!-- File: components/activity/ActivityPricing.vue -->
<script setup>
    import { ref, computed } from 'vue'
    
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
      },
      timeSlots: {
        type: Array,
        default: () => []
      }
    })
    
    const emit = defineEmits(['update:modelValue'])
    
    const formData = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })
    
    // Surcharge management
    const showSurchargeDialog = ref(false)
    const newSurcharge = ref({
      dates: [],
      multiplier: 1.5,
      fixedAmount: null,
      label: '',
      type: 'multiplier' // 'multiplier' or 'fixed'
    })
    
    const addSurcharge = () => {
      if (newSurcharge.value.dates.length === 0) {
        alert('Please select at least one date')
        return
      }
    
      if (!newSurcharge.value.label) {
        alert('Please provide a label')
        return
      }
    
      formData.value.surcharges.push({
        dates: [...newSurcharge.value.dates],
        multiplier: newSurcharge.value.type === 'multiplier' ? newSurcharge.value.multiplier : 1,
        fixedAmount: newSurcharge.value.type === 'fixed' ? newSurcharge.value.fixedAmount : null,
        label: newSurcharge.value.label,
        type: newSurcharge.value.type
      })
    
      // Reset form
      newSurcharge.value = {
        dates: [],
        multiplier: 1.5,
        fixedAmount: null,
        label: '',
        type: 'multiplier'
      }
      showSurchargeDialog.value = false
    }
    
    const removeSurcharge = (index) => {
      formData.value.surcharges.splice(index, 1)
    }
    
    const calculateSurchargedPrice = (surcharge) => {
      if (surcharge.type === 'multiplier') {
        return (formData.value.basePrice * surcharge.multiplier).toFixed(2)
      } else {
        return (parseFloat(formData.value.basePrice) + parseFloat(surcharge.fixedAmount)).toFixed(2)
      }
    }
    
    // Closed dates management
    const showClosureDialog = ref(false)
    const newClosure = ref({
      dates: [],
      slots: [], // For slot-based activities
      reason: ''
    })
    
    const addClosure = () => {
      if (newClosure.value.dates.length === 0) {
        alert('Please select at least one date')
        return
      }
    
      for (const date of newClosure.value.dates) {
        if (props.durationType === 'slot' && newClosure.value.slots.length > 0) {
          // Close specific slots on specific date
          for (const slot of newClosure.value.slots) {
            formData.value.closedDates.push({
              date,
              slot,
              reason: newClosure.value.reason || 'Closed by vendor'
            })
          }
        } else {
          // Close entire day
          formData.value.closedDates.push({
            date,
            slot: null,
            reason: newClosure.value.reason || 'Closed by vendor'
          })
        }
      }
    
      // Reset form
      newClosure.value = {
        dates: [],
        slots: [],
        reason: ''
      }
      showClosureDialog.value = false
    }
    
    const removeClosure = (index) => {
      formData.value.closedDates.splice(index, 1)
    }
    
    // Date picker setup
    const datePickerMode = ref('multiple')
    const allowedDates = (val) => {
      const date = new Date(val)
      const start = new Date(props.startDate)
      const end = new Date(props.endDate)
      return date >= start && date <= end
    }
    
    // Validation
    const isValid = computed(() => {
      return !!(
        formData.value.basePrice > 0
      )
    })
    
    defineExpose({ isValid })
    </script>
    
    <template>
      <div class="activity-pricing">
        <h2 class="text-h5 font-weight-bold mb-4">Pricing & Exceptions</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Set your base price and configure surcharges or closures
        </p>
    
        <!-- Base Price -->
        <v-row class="mb-6">
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="formData.basePrice"
              label="Base Price Per Person *"
              type="number"
              variant="outlined"
              prefix="₹"
              :min="0"
              :step="50"
              prepend-inner-icon="mdi-currency-inr"
              :rules="[v => v > 0 || 'Price must be greater than 0']"
              hint="Standard price per participant"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="tonal" color="success" class="pa-4" style="height: 100%;">
              <div class="text-caption text-medium-emphasis mb-1">Base Price</div>
              <div class="text-h4 font-weight-bold text-success">
                ₹{{ formData.basePrice || 0 }}
              </div>
              <div class="text-caption">per person</div>
            </v-card>
          </v-col>
        </v-row>
    
        <v-divider class="my-6" />
    
        <!-- Price Surcharges -->
        <div class="mb-6">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-h6 font-weight-medium">Price Surcharges (Optional)</div>
              <div class="text-caption text-medium-emphasis">
                Add higher prices for specific dates (weekends, festivals, etc.)
              </div>
            </div>
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-plus"
              @click="showSurchargeDialog = true"
            >
              Add Surcharge
            </v-btn>
          </div>
    
          <!-- Surcharges List -->
          <v-card v-if="formData.surcharges.length > 0" variant="outlined" class="pa-4">
            <v-list>
              <v-list-item
                v-for="(surcharge, index) in formData.surcharges"
                :key="index"
                class="px-0"
              >
                <template #prepend>
                  <v-icon color="warning">mdi-cash-plus</v-icon>
                </template>
    
                <v-list-item-title class="font-weight-medium">
                  {{ surcharge.label }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ surcharge.dates.length }} date(s) • 
                  <span v-if="surcharge.type === 'multiplier'">
                    {{ surcharge.multiplier }}x multiplier
                  </span>
                  <span v-else>
                    +₹{{ surcharge.fixedAmount }} surcharge
                  </span>
                  • Final: ₹{{ calculateSurchargedPrice(surcharge) }}
                </v-list-item-subtitle>
    
                <template #append>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    size="small"
                    color="error"
                    @click="removeSurcharge(index)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card>
    
          <v-alert v-else type="info" variant="tonal">
            No surcharges added. Your base price will apply to all dates.
          </v-alert>
        </div>
    
        <!-- Surcharge Dialog -->
        <v-dialog v-model="showSurchargeDialog" max-width="600">
          <v-card>
            <v-card-title>Add Price Surcharge</v-card-title>
            <v-card-text>
              <!-- Surcharge Type -->
              <v-radio-group v-model="newSurcharge.type" inline class="mb-4">
                <v-radio label="Multiplier (e.g., 1.5x)" value="multiplier" />
                <v-radio label="Fixed Amount (e.g., +₹500)" value="fixed" />
              </v-radio-group>
    
              <!-- Date Selection -->
              <div class="mb-4">
                <label class="text-subtitle-2 font-weight-medium mb-2 d-block">Select Dates *</label>
                <v-date-picker
                  v-model="newSurcharge.dates"
                  :allowed-dates="allowedDates"
                  multiple
                  color="primary"
                  show-adjacent-months
                  width="100%"
                />
                <div class="text-caption text-medium-emphasis mt-2">
                  Selected: {{ newSurcharge.dates.length }} date(s)
                </div>
              </div>
    
              <!-- Multiplier or Fixed Amount -->
              <v-text-field
                v-if="newSurcharge.type === 'multiplier'"
                v-model.number="newSurcharge.multiplier"
                label="Price Multiplier *"
                type="number"
                variant="outlined"
                :min="1"
                :max="10"
                :step="0.1"
                hint="e.g., 1.5 = 150% of base price"
                persistent-hint
                class="mb-4"
              />
    
              <v-text-field
                v-else
                v-model.number="newSurcharge.fixedAmount"
                label="Fixed Surcharge Amount *"
                type="number"
                variant="outlined"
                prefix="₹"
                :min="0"
                hint="Additional amount to add to base price"
                persistent-hint
                class="mb-4"
              />
    
              <!-- Label -->
              <v-text-field
                v-model="newSurcharge.label"
                label="Label/Reason *"
                variant="outlined"
                placeholder="e.g., Weekend Premium, Diwali Festival"
                class="mb-4"
              />
    
              <!-- Preview -->
              <v-card v-if="formData.basePrice && newSurcharge.dates.length > 0" variant="tonal" color="info" class="pa-3">
                <div class="text-caption font-weight-medium mb-1">Preview</div>
                <div class="text-body-2">
                  Base Price: ₹{{ formData.basePrice }}
                  <v-icon>mdi-arrow-right</v-icon>
                  Surcharge Price: ₹{{ 
                    newSurcharge.type === 'multiplier' 
                      ? (formData.basePrice * newSurcharge.multiplier).toFixed(2)
                      : (parseFloat(formData.basePrice) + parseFloat(newSurcharge.fixedAmount || 0)).toFixed(2)
                  }}
                </div>
              </v-card>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="showSurchargeDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" @click="addSurcharge">Add Surcharge</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
    
        <v-divider class="my-6" />
    
        <!-- Closed Dates/Slots -->
        <div class="mb-6">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-h6 font-weight-medium">Closed Days/Slots (Optional)</div>
              <div class="text-caption text-medium-emphasis">
                Mark specific dates or slots as unavailable
              </div>
            </div>
            <v-btn
              color="error"
              variant="outlined"
              prepend-icon="mdi-calendar-remove"
              @click="showClosureDialog = true"
            >
              Add Closure
            </v-btn>
          </div>
    
          <!-- Closures List -->
          <v-card v-if="formData.closedDates.length > 0" variant="outlined" class="pa-4">
            <v-list>
              <v-list-item
                v-for="(closure, index) in formData.closedDates"
                :key="index"
                class="px-0"
              >
                <template #prepend>
                  <v-icon color="error">mdi-cancel</v-icon>
                </template>
    
                <v-list-item-title class="font-weight-medium">
                  {{ new Date(closure.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) }}
                  <v-chip v-if="closure.slot" size="small" class="ml-2">{{ closure.slot }}</v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ closure.reason }}
                </v-list-item-subtitle>
    
                <template #append>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    size="small"
                    color="error"
                    @click="removeClosure(index)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card>
    
          <v-alert v-else type="info" variant="tonal">
            No closures added. Activity will be available on all dates.
          </v-alert>
        </div>
    
        <!-- Closure Dialog -->
        <v-dialog v-model="showClosureDialog" max-width="600">
          <v-card>
            <v-card-title>Add Closure</v-card-title>
            <v-card-text>
              <!-- Date Selection -->
              <div class="mb-4">
                <label class="text-subtitle-2 font-weight-medium mb-2 d-block">Select Dates *</label>
                <v-date-picker
                  v-model="newClosure.dates"
                  :allowed-dates="allowedDates"
                  multiple
                  color="error"
                  show-adjacent-months
                  width="100%"
                />
                <div class="text-caption text-medium-emphasis mt-2">
                  Selected: {{ newClosure.dates.length }} date(s)
                </div>
              </div>
    
              <!-- Slot Selection (only for slot-based) -->
              <v-select
                v-if="durationType === 'slot' && timeSlots.length > 0"
                v-model="newClosure.slots"
                :items="timeSlots"
                item-title="name"
                item-value="name"
                label="Select Time Slots (Optional)"
                variant="outlined"
                multiple
                chips
                hint="Leave empty to close the entire day"
                persistent-hint
                class="mb-4"
              />
    
              <!-- Reason -->
              <v-textarea
                v-model="newClosure.reason"
                label="Reason (Optional)"
                variant="outlined"
                placeholder="e.g., Maintenance, Bad weather expected, Holiday"
                rows="3"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="showClosureDialog = false">Cancel</v-btn>
              <v-btn color="error" variant="flat" @click="addClosure">Add Closure</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
    
        <!-- Info Card -->
        <v-card variant="tonal" color="info" class="pa-4">
          <div class="d-flex align-start">
            <v-icon size="24" class="mr-3">mdi-information</v-icon>
            <div>
              <div class="text-subtitle-2 font-weight-medium mb-1">Pricing Tips</div>
              <ul class="text-caption text-medium-emphasis">
                <li>Set competitive base pricing to attract customers</li>
                <li>Use surcharges for peak demand periods (weekends, holidays)</li>
                <li>Mark closures in advance to avoid customer disappointment</li>
                <li>You can reduce capacity for offline bookings after publishing</li>
              </ul>
            </div>
          </div>
        </v-card>
      </div>
    </template>
    
    <style scoped>
    .activity-pricing {
      max-width: 900px;
      margin: 0 auto;
    }
    </style>