<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4 font-weight-bold">Vendors</h1>
      
      <v-btn
        color="primary"
        prepend-icon="mdi-refresh"
        @click="fetchVendors"
        :loading="loading"
      >
        Refresh
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              clearable
              @update:model-value="fetchVendors"
            />
          </v-col>
          
          <v-col cols="12" sm="6" md="6">
            <v-text-field
              v-model="filters.search"
              label="Search"
              prepend-inner-icon="mdi-magnify"
              clearable
              @update:model-value="debouncedSearch"
            />
          </v-col>
          
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.sortBy"
              :items="sortOptions"
              label="Sort By"
              @update:model-value="fetchVendors"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="vendors"
        :loading="loading"
        :items-per-page="filters.limit"
        hide-default-footer
      >
        <!-- Status chip -->
        <template #item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
          >
            {{ item.status }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-eye"
            size="small"
            variant="text"
            @click="viewVendor(item.id)"
          />
          
          <v-btn
            v-if="item.status === 'pending'"
            icon="mdi-check"
            size="small"
            variant="text"
            color="success"
            @click="approveVendor(item)"
          />
          
          <v-btn
            v-if="item.status === 'pending'"
            icon="mdi-close"
            size="small"
            variant="text"
            color="error"
            @click="rejectVendor(item)"
          />
        </template>

        <!-- Loading -->
        <template #loading>
          <v-skeleton-loader type="table-row@5" />
        </template>
      </v-data-table>

      <!-- Pagination -->
      <v-card-actions class="justify-center">
        <v-pagination
          v-model="filters.page"
          :length="totalPages"
          :total-visible="5"
          @update:model-value="fetchVendors"
        />
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const api = useApi()
const { $toast } = useNuxtApp()
const router = useRouter()

// State
const loading = ref(false)
const vendors = ref([])
const totalPages = ref(0)

// Filters
const filters = reactive({
  page: 1,
  limit: 10,
  status: '',
  search: '',
  sortBy: 'created_at',
  sortOrder: 'desc'
})

// Options
const statusOptions = [
  { title: 'All', value: '' },
  { title: 'Pending', value: 'pending' },
  { title: 'Approved', value: 'approved' },
  { title: 'Rejected', value: 'rejected' },
  { title: 'Suspended', value: 'suspended' }
]

const sortOptions = [
  { title: 'Newest First', value: 'created_at' },
  { title: 'Name', value: 'name' },
  { title: 'Email', value: 'email' }
]

// Table headers
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Company', key: 'company_name' },
  { title: 'Status', key: 'status' },
  { title: 'Created', key: 'created_at' },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Get status color
const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    suspended: 'grey'
  }
  return colors[status] || 'default'
}

// Fetch vendors
const fetchVendors = async () => {
  loading.value = true

  try {
    const params = {
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    }

    if (filters.status) params.status = filters.status
    if (filters.search) params.search = filters.search

    const response = await api.vendors.list(params)

    vendors.value = response.data.vendors
    totalPages.value = response.data.pagination.totalPages
  } catch (error) {
    console.error('Failed to fetch vendors:', error)
    $toast.error('Failed to load vendors')
  } finally {
    loading.value = false
  }
}

// Debounced search
const debouncedSearch = useDebounceFn(() => {
  filters.page = 1
  fetchVendors()
}, 500)

// View vendor
const viewVendor = (id) => {
  router.push(`/vendors/${id}`)
}

// Approve vendor
const approveVendor = async (vendor) => {
  if (!confirm(`Approve vendor: ${vendor.name}?`)) return

  try {
    await api.vendors.approve(vendor.id, 'Approved by admin')
    $toast.success('Vendor approved successfully')
    await fetchVendors()
  } catch (error) {
    console.error('Failed to approve vendor:', error)
    $toast.error('Failed to approve vendor')
  }
}

// Reject vendor
const rejectVendor = async (vendor) => {
  const reason = prompt(`Rejection reason for ${vendor.name}:`)
  if (!reason) return

  try {
    await api.vendors.reject(vendor.id, reason)
    $toast.success('Vendor rejected')
    await fetchVendors()
  } catch (error) {
    console.error('Failed to reject vendor:', error)
    $toast.error('Failed to reject vendor')
  }
}

// Fetch vendors on mount
onMounted(() => {
  fetchVendors()
})
</script>
