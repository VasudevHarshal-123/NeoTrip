<!-- File: pages/dashboard/activities/[id].vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth-global-client']
})

const route = useRoute()
const router = useRouter()

const listingId = route.params.id
const activity = ref(null)
const timeSlots = ref([])
const capacityData = ref([])
const loading = ref(true)  // ✅ Start as true
const saving = ref(false)
const selectedDate = ref(new Date().toISOString().split('T')[0])

// Date range for display
const startDate = ref(null)
const endDate = ref(null)
const availableDates = ref([])

// Load activity details
const loadActivity = async () => {
  try {
    console.log('🔵 [Manage Capacity] Loading activity:', listingId)
    
    // ✅ Use the composable - it works!
    const supabase = useSupabase()
    
    const { data, error } = await supabase
      .from('activity_listings')
      .select(`
        *,
        activities_master (name, category),
        activity_time_slots (*)
      `)
      .eq('id', listingId)
      .single()

    if (error) throw error

    activity.value = data
    timeSlots.value = data.activity_time_slots || []
    startDate.value = data.activity_start_date
    endDate.value = data.activity_end_date

    // Generate date range
    generateDateRange()

    // Load capacity data
    await loadCapacityData()

    console.log('✅ Activity loaded:', data.title)
  } catch (error) {
    console.error('❌ Error loading activity:', error)
    alert('Failed to load activity')
    router.push('/dashboard/activities')
  } finally {
    loading.value = false
  }
}

// Generate date range
const generateDateRange = () => {
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  const dates = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().split('T')[0])
  }

  availableDates.value = dates
  if (!selectedDate.value || !dates.includes(selectedDate.value)) {
    selectedDate.value = dates[0]
  }
}

// Load capacity data
const loadCapacityData = async () => {
  try {
    const supabase = useSupabase()
    
    const { data, error } = await supabase
      .from('listing_daily_capacity')
      .select('*')
      .eq('listing_id', listingId)
      .gte('availability_date', startDate.value)
      .lte('availability_date', endDate.value)
      .order('availability_date')
      .order('time_slot_id')

    if (error) throw error

    capacityData.value = data || []
    console.log('✅ Loaded capacity data:', data?.length || 0, 'records')
  } catch (error) {
    console.error('❌ Error loading capacity:', error)
  }
}

// Get capacity for specific date and slot
const getCapacityForDateSlot = (date, slotId = null) => {
  return capacityData.value.find(
    c => c.availability_date === date && 
    (slotId ? c.time_slot_id === slotId : c.time_slot_id === null)
  )
}

// Capacity data for selected date
const selectedDateCapacity = computed(() => {
  if (activity.value?.duration_type === 'slot') {
    // Slot-based: show all slots for this date
    return timeSlots.value.map(slot => {
      const capacity = getCapacityForDateSlot(selectedDate.value, slot.id)
      return {
        slotId: slot.id,
        slotName: slot.slot_name,
        totalCapacity: capacity?.total_capacity || slot.max_capacity || 0,
        bookedCount: capacity?.booked_count || 0,
        offlineBookings: capacity?.offline_bookings || 0,
        availableCapacity: capacity?.available_capacity || slot.max_capacity || 0,
        capacityId: capacity?.id
      }
    })
  } else {
    // Single-day or multi-day: show one entry
    const capacity = getCapacityForDateSlot(selectedDate.value, null)
    return [{
      slotId: null,
      slotName: 'Full Day',
      totalCapacity: capacity?.total_capacity || activity.value?.max_participants_per_day || 0,
      bookedCount: capacity?.booked_count || 0,
      offlineBookings: capacity?.offline_bookings || 0,
      availableCapacity: capacity?.available_capacity || activity.value?.max_participants_per_day || 0,
      capacityId: capacity?.id
    }]
  }
})

// Update offline bookings
const updateOfflineBookings = async (item, newValue) => {
  if (newValue < 0) {
    alert('Offline bookings cannot be negative')
    return
  }

  if (newValue + item.bookedCount > item.totalCapacity) {
    alert(`Cannot exceed total capacity of ${item.totalCapacity}`)
    return
  }

  saving.value = true
  try {
    const supabase = useSupabase()
    
    // If capacity record exists, update it
    if (item.capacityId) {
      const { error } = await supabase
        .from('listing_daily_capacity')
        .update({ offline_bookings: newValue })
        .eq('id', item.capacityId)

      if (error) throw error
    } else {
      // Create new capacity record
      const { error } = await supabase
        .from('listing_daily_capacity')
        .insert({
          listing_id: listingId,
          time_slot_id: item.slotId,
          availability_date: selectedDate.value,
          total_capacity: item.totalCapacity,
          booked_count: 0,
          offline_bookings: newValue
        })

      if (error) throw error
    }

    console.log('✅ Updated offline bookings')
    await loadCapacityData()
  } catch (error) {
    console.error('❌ Error updating:', error)
    alert('Failed to update offline bookings')
  } finally {
    saving.value = false
  }
}

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// ✅ ONLY call on client-side (onMounted only runs client-side)
onMounted(() => {
  console.log('🟢 [Manage Capacity] Page mounted')
  console.log('📍 Activity ID:', listingId)
  loadActivity()
})
</script>

<template>
  <div class="manage-capacity">
    <!-- Header -->
    <div class="mb-6">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        class="mb-4"
        @click="router.push('/dashboard/activities')"
      >
        Back to Activities
      </v-btn>

      <h1 class="text-h4 font-weight-bold mb-2">Manage Capacity</h1>
      <p v-if="activity" class="text-body-1 text-medium-emphasis">
        {{ activity.title }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="text-body-1 mt-4">Loading capacity data...</p>
    </div>

    <!-- Content -->
    <v-row v-else>
      <!-- Date Picker -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Select Date</v-card-title>
          <v-card-text>
            <v-date-picker
              v-model="selectedDate"
              :min="startDate"
              :max="endDate"
              color="primary"
              width="100%"
              show-adjacent-months
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Capacity Management -->
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            Capacity for {{ formatDate(selectedDate) }}
          </v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal" class="mb-4">
              <div class="text-body-2">
                <strong>How to manage capacity:</strong>
                <ul class="mt-2">
                  <li>Set offline bookings to block capacity</li>
                  <li>Available capacity = Total - Online Bookings - Offline Bookings</li>
                  <li>Use this to handle phone/offline reservations</li>
                </ul>
              </div>
            </v-alert>

            <!-- Capacity Table -->
            <v-table>
              <thead>
                <tr>
                  <th v-if="activity && activity.duration_type === 'slot'">Time Slot</th>
                  <th class="text-center">Total Capacity</th>
                  <th class="text-center">Online Bookings</th>
                  <th class="text-center">Offline Bookings</th>
                  <th class="text-center">Available</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in selectedDateCapacity" :key="item.slotId || 'full-day'">
                  <td v-if="activity && activity.duration_type === 'slot'">
                    <strong>{{ item.slotName }}</strong>
                  </td>
                  <td class="text-center">
                    <v-chip color="primary">{{ item.totalCapacity }}</v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip color="info">{{ item.bookedCount }}</v-chip>
                  </td>
                  <td class="text-center">
                    <v-text-field
                      :model-value="item.offlineBookings"
                      type="number"
                      min="0"
                      :max="item.totalCapacity - item.bookedCount"
                      variant="outlined"
                      density="compact"
                      hide-details
                      style="width: 100px; display: inline-block;"
                      :disabled="saving"
                      @change="(e) => updateOfflineBookings(item, parseInt(e.target.value) || 0)"
                    />
                  </td>
                  <td class="text-center">
                    <v-chip :color="item.availableCapacity > 0 ? 'success' : 'error'">
                      {{ item.availableCapacity }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-progress-linear v-if="saving" indeterminate color="primary" class="mt-4" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.manage-capacity {
  max-width: 1200px;
  margin: 0 auto;
}
</style>