<!-- File: pages/dashboard/activities.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth-global-client']
})

const router = useRouter()
const supabase = useSupabase()

const activities = ref([])
const loading = ref(false)
const filterStatus = ref('all')

// Status options
const statusOptions = [
  { text: 'All', value: 'all' },
  { text: 'Draft', value: 'draft' },
  { text: 'Pending Approval', value: 'pending' },
  { text: 'Approved', value: 'approved' },
  { text: 'Active', value: 'active' },
  { text: 'Inactive', value: 'inactive' }
]

// Status colors
const getStatusColor = (status) => {
  const colors = {
    draft: 'grey',
    pending: 'warning',
    approved: 'success',
    active: 'primary',
    inactive: 'error'
  }
  return colors[status] || 'grey'
}

// Duration type labels
const getDurationTypeLabel = (type) => {
  const labels = {
    slot: 'Time Slot Based',
    single_day: 'Single Day',
    multi_day: 'Multi-Day'
  }
  return labels[type] || type
}

// Filtered activities
const filteredActivities = computed(() => {
  if (filterStatus.value === 'all') return activities.value
  return activities.value.filter(a => a.status === filterStatus.value)
})

// Load activities
const loadActivities = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const { data, error } = await supabase
      .from('activity_listings')
      .select(`
        id,
        title,
        description,
        duration_type,
        activity_start_date,
        activity_end_date,
        status,
        is_published,
        created_at,
        images,
        city,
        state,
        activity_id,
        activities_master (
          name,
          category
        )
      `)
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    activities.value = data.map(activity => ({
      ...activity,
      activity_name: activity.activities_master?.name || 'Unknown',
      activity_category: activity.activities_master?.category || 'Unknown'
    }))

    console.log('✅ Loaded', activities.value.length, 'activities')
  } catch (error) {
    console.error('❌ Error loading activities:', error)
  } finally {
    loading.value = false
  }
}

// Actions
const createNew = () => {
  router.push('/dashboard/create-activity')
}

const editActivity = (id) => {
  router.push(`/dashboard/create-activity?edit=${id}`)
}

const duplicateActivity = (id) => {
  router.push(`/dashboard/create-activity?duplicate=${id}`)
}

const manageCapacity = (activity) => {
  router.push(`/dashboard/activities/${activity.id}`)
}

const publishActivity = async (activity) => {
  if (!confirm('Are you sure you want to publish this activity?')) return

  try {
    const { error } = await supabase
      .from('activity_listings')
      .update({ status: 'active', is_published: true })
      .eq('id', activity.id)

    if (error) throw error

    alert('Activity published successfully!')
    await loadActivities()
  } catch (error) {
    console.error('Error publishing:', error)
    alert('Failed to publish activity')
  }
}

onMounted(() => {
  loadActivities()
})
</script>

<template>
  <div class="activities-page">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">My Activities</h1>
        <p class="text-body-2 text-medium-emphasis">
          Manage your activity listings
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        size="large"
        @click="createNew"
      >
        Create New Activity
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-4 pa-4">
      <v-row align="center">
        <v-col cols="12" md="4">
          <v-select
            v-model="filterStatus"
            :items="statusOptions"
            label="Filter by Status"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="8" class="text-right">
          <v-chip class="mr-2">
            Total: {{ activities.length }}
          </v-chip>
          <v-chip color="success">
            Approved: {{ activities.filter(a => a.status === 'approved').length }}
          </v-chip>
        </v-col>
      </v-row>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="text-body-1 mt-4">Loading activities...</p>
    </div>

    <!-- Empty State -->
    <v-card v-else-if="activities.length === 0" class="pa-10 text-center">
      <v-icon size="80" color="grey">mdi-calendar-blank</v-icon>
      <h2 class="text-h5 mt-4 mb-2">No Activities Yet</h2>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Get started by creating your first activity listing
      </p>
      <v-btn color="primary" size="large" @click="createNew">
        Create Your First Activity
      </v-btn>
    </v-card>

    <!-- Activities List -->
    <v-row v-else>
      <v-col
        v-for="activity in filteredActivities"
        :key="activity.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card elevation="2" class="h-100 d-flex flex-column">
          <!-- Image -->
          <v-img
            :src="activity.images?.[0] ? `https://bmpjprtpcqaztfbqfunc.supabase.co/storage/v1/object/public/vendor-documents/${activity.images[0]}` : 'https://via.placeholder.com/400x250?text=No+Image'"
            height="200"
            cover
          >
            <div class="pa-2">
              <v-chip
                :color="getStatusColor(activity.status)"
                size="small"
                class="text-uppercase"
              >
                {{ activity.status }}
              </v-chip>
            </div>
          </v-img>

          <!-- Content -->
          <v-card-text class="flex-grow-1">
            <div class="text-overline text-medium-emphasis mb-1">
              {{ activity.activity_name }}
            </div>
            <h3 class="text-h6 mb-2">{{ activity.title }}</h3>
            
            <div class="text-body-2 text-medium-emphasis mb-3">
              <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
              {{ activity.city }}, {{ activity.state }}
            </div>

            <v-chip size="small" variant="outlined" class="mr-2">
              <v-icon start size="small">mdi-calendar</v-icon>
              {{ getDurationTypeLabel(activity.duration_type) }}
            </v-chip>

            <v-chip size="small" variant="outlined">
              <v-icon start size="small">mdi-calendar-range</v-icon>
              {{ new Date(activity.activity_start_date).toLocaleDateString() }}
            </v-chip>
          </v-card-text>

          <v-divider />

          <!-- Actions -->
          <v-card-actions>
            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  variant="text"
                  size="small"
                  v-bind="props"
                >
                  Actions
                  <v-icon end>mdi-menu-down</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item
                  v-if="activity.status === 'draft'"
                  prepend-icon="mdi-pencil"
                  title="Edit"
                  @click="editActivity(activity.id)"
                />
                <v-list-item
                  prepend-icon="mdi-content-copy"
                  title="Duplicate"
                  @click="duplicateActivity(activity.id)"
                />
                <v-list-item
                  v-if="activity.status === 'approved'"
                  prepend-icon="mdi-chart-box"
                  title="Manage Capacity"
                  @click="manageCapacity(activity)"
                />
                <v-list-item
                  v-if="activity.status === 'approved' && !activity.is_published"
                  prepend-icon="mdi-publish"
                  title="Publish"
                  @click="publishActivity(activity)"
                />
              </v-list>
            </v-menu>

            <v-spacer />

            <v-btn
              v-if="activity.status === 'approved'"
              icon="mdi-chart-box"
              variant="text"
              size="small"
              color="primary"
              @click="manageCapacity(activity)"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty Filter State -->
    <v-card v-if="!loading && activities.length > 0 && filteredActivities.length === 0" class="pa-10 text-center">
      <v-icon size="80" color="grey">mdi-filter-off</v-icon>
      <h2 class="text-h5 mt-4 mb-2">No Activities Found</h2>
      <p class="text-body-1 text-medium-emphasis">
        No activities match the selected filter
      </p>
    </v-card>
  </div>
</template>

<style scoped>
.activities-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>