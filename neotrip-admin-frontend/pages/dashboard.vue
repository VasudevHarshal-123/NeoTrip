<template>
  <div>
    <h1 class="text-h4 font-weight-bold mb-6">Dashboard</h1>

    <!-- Loading state -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <!-- Stats cards -->
    <v-row>
      <!-- Vendors -->
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="d-flex justify-space-between align-center">
              <div>
                <p class="text-caption text-grey mb-1">Total Vendors</p>
                <h2 class="text-h4 font-weight-bold">{{ vendorStats?.total || 0 }}</h2>
                <p class="text-caption text-warning mt-1">
                  {{ vendorStats?.byStatus?.pending || 0 }} pending
                </p>
              </div>
              <v-avatar color="primary" size="56">
                <v-icon icon="mdi-store" size="28" />
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Bookings -->
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="d-flex justify-space-between align-center">
              <div>
                <p class="text-caption text-grey mb-1">Total Bookings</p>
                <h2 class="text-h4 font-weight-bold">{{ bookingStats?.total || 0 }}</h2>
                <p class="text-caption text-success mt-1">
                  {{ bookingStats?.todayBookings || 0 }} today
                </p>
              </div>
              <v-avatar color="success" size="56">
                <v-icon icon="mdi-calendar-check" size="28" />
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Revenue -->
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="d-flex justify-space-between align-center">
              <div>
                <p class="text-caption text-grey mb-1">Total Revenue</p>
                <h2 class="text-h4 font-weight-bold">
                  ₹{{ formatCurrency(bookingStats?.totalRevenue || 0) }}
                </h2>
                <p class="text-caption text-info mt-1">All time</p>
              </div>
              <v-avatar color="info" size="56">
                <v-icon icon="mdi-currency-inr" size="28" />
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Settlements -->
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="d-flex justify-space-between align-center">
              <div>
                <p class="text-caption text-grey mb-1">Pending Payouts</p>
                <h2 class="text-h4 font-weight-bold">
                  ₹{{ formatCurrency(settlementStats?.pendingPayout || 0) }}
                </h2>
                <p class="text-caption text-warning mt-1">
                  {{ settlementStats?.byStatus?.ready_for_review || 0 }} for review
                </p>
              </div>
              <v-avatar color="warning" size="56">
                <v-icon icon="mdi-cash-multiple" size="28" />
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick actions -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>Quick Actions</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="primary"
                  prepend-icon="mdi-store-check"
                  to="/vendors?status=pending"
                >
                  Approve Vendors
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="success"
                  prepend-icon="mdi-calendar-check"
                  to="/bookings"
                >
                  View Bookings
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="warning"
                  prepend-icon="mdi-cash-check"
                  to="/settlements?status=ready_for_review"
                >
                  Process Settlements
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="info"
                  prepend-icon="mdi-chart-line"
                  to="/reports"
                >
                  View Reports
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent activity placeholder -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Recent Vendors</v-card-title>
          <v-card-text>
            <p class="text-center text-grey pa-4">
              Recent vendor registrations will appear here
            </p>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Recent Bookings</v-card-title>
          <v-card-text>
            <p class="text-center text-grey pa-4">
              Recent bookings will appear here
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const api = useApi()
const { $toast } = useNuxtApp()

// State
const loading = ref(true)
const vendorStats = ref(null)
const bookingStats = ref(null)
const settlementStats = ref(null)

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount)
}

// Fetch dashboard stats
const fetchStats = async () => {
  loading.value = true

  try {
    const [vendors, bookings, settlements] = await Promise.all([
      api.vendors.stats(),
      api.bookings.stats(),
      api.settlements.stats()
    ])

    vendorStats.value = vendors.data
    bookingStats.value = bookings.data
    settlementStats.value = settlements.data
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    $toast.error('Failed to load dashboard statistics')
  } finally {
    loading.value = false
  }
}

// Fetch stats on mount
onMounted(() => {
  fetchStats()
})
</script>
