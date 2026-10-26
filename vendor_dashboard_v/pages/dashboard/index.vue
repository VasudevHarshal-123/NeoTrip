<!-- File: pages/dashboard/index.vue -->
<script setup>
  import { useVendorStore } from '~/store/vendor.store.ts'
  
  definePageMeta({
    name: 'dashboard',
    layout: 'dashboard',  // ✅ USE THE LAYOUT!
    middleware: ['auth-global-client'],
  })
  
  const vendorStore = useVendorStore()
  const supabase = ref(null)
  const user = ref(null)
  
  // ✅ NEW: Real verification status
  const verificationStatus = ref({
    vendorApproved: false,
    documentsApproved: false,
    totalDocs: 0,
    approvedDocs: 0,
    pendingDocs: 0
  })
  
  onMounted(async () => {
    const nuxtApp = useNuxtApp()
    supabase.value = nuxtApp.$supabase.client
    
    const { data } = await supabase.value.auth.getUser()
    user.value = data.user
    
    await vendorStore.fetchVendorData()
    await fetchVerificationStatus()
  })
  
  const fetchVerificationStatus = async () => {
    try {
      const vendorId = vendorStore.vendor?.id
      if (!vendorId) return
  
      const { data: docs, error } = await supabase.value
        .from('vendor_documents')
        .select('status, document_type, document_category')
        .eq('vendor_id', vendorId)
  
      if (error) throw error
  
      const totalDocs = docs?.length || 0
      const approvedDocs = docs?.filter(d => d.status === 'approved').length || 0
      const pendingDocs = docs?.filter(d => d.status === 'pending').length || 0
  
      const hasPAN = docs?.some(d => d.document_type === 'pan_card' && d.status === 'approved')
      const hasAadhaar = docs?.some(d => d.document_type === 'aadhaar_card' && d.status === 'approved')
      const hasPassbook = docs?.some(d => d.document_type === 'passbook' && d.status === 'approved')
      const hasCertificate = docs?.some(d => d.document_category === 'activity_license' && d.status === 'approved')
  
      verificationStatus.value = {
        vendorApproved: vendorStore.vendor?.status === 'approved',
        documentsApproved: hasPAN && hasAadhaar && hasPassbook && hasCertificate,
        totalDocs,
        approvedDocs,
        pendingDocs
      }
  
      console.log('✅ Verification Status:', verificationStatus.value)
    } catch (error) {
      console.error('❌ Error fetching verification status:', error)
    }
  }
  
  const displayName = computed(() => {
    return vendorStore.vendor?.name || user.value?.email?.split('@')[0] || 'Vendor'
  })
  </script>
  
  <template>
    <div>
      <!-- Welcome Section -->
      <v-row>
        <v-col cols="12">
          <v-card elevation="2" class="mb-4">
            <v-card-text class="pa-4 pa-sm-6">
              <h1 class="text-h4 font-weight-bold mb-2">
                Welcome Back, {{ displayName }}! 👋
              </h1>
              <p class="text-h6 text-medium-emphasis">
                {{ vendorStore.vendor?.company_name || 'Your Vendor Dashboard' }}
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
  
      <!-- Stats Cards -->
      <v-row>
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold text-primary">0</div>
                  <div class="text-body-2 text-medium-emphasis mt-1">Total Bookings</div>
                </div>
                <v-avatar color="primary" variant="tonal" size="48">
                  <v-icon size="28">mdi-calendar-check</v-icon>
                </v-avatar>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
  
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold text-success">0</div>
                  <div class="text-body-2 text-medium-emphasis mt-1">Completed</div>
                </div>
                <v-avatar color="success" variant="tonal" size="48">
                  <v-icon size="28">mdi-check-circle</v-icon>
                </v-avatar>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
  
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold text-warning">0</div>
                  <div class="text-body-2 text-medium-emphasis mt-1">Pending</div>
                </div>
                <v-avatar color="warning" variant="tonal" size="48">
                  <v-icon size="28">mdi-clock-outline</v-icon>
                </v-avatar>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
  
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold text-info">
                    {{ vendorStore.vendor?.activities?.length || 0 }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mt-1">Activities Offered</div>
                </div>
                <v-avatar color="info" variant="tonal" size="48">
                  <v-icon size="28">mdi-hiking</v-icon>
                </v-avatar>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
  
      <!-- Verification Status -->
      <v-row class="mt-2">
        <v-col cols="12" lg="8">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between pa-4">
              <span class="text-h6">Getting Started</span>
              <v-icon>mdi-rocket-launch</v-icon>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>Account Created</v-list-item-title>
                  <v-list-item-subtitle>Your vendor account is active</v-list-item-subtitle>
                </v-list-item>
  
                <v-list-item>
                  <template #prepend>
                    <v-icon :color="verificationStatus.documentsApproved ? 'success' : 'warning'">
                      {{ verificationStatus.documentsApproved ? 'mdi-check-circle' : 'mdi-clock-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title>
                    {{ verificationStatus.documentsApproved ? 'Documents Approved' : 'Documents Uploaded' }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ verificationStatus.approvedDocs }}/{{ verificationStatus.totalDocs }} documents approved
                  </v-list-item-subtitle>
                </v-list-item>
  
                <v-list-item>
                  <template #prepend>
                    <v-icon :color="verificationStatus.vendorApproved ? 'success' : 'warning'">
                      {{ verificationStatus.vendorApproved ? 'mdi-check-circle' : 'mdi-clock-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title>
                    {{ verificationStatus.vendorApproved ? 'Account Verified' : 'Verification Pending' }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ verificationStatus.vendorApproved 
                      ? 'Your account has been verified' 
                      : 'We\'re reviewing your documents (2-3 business days)' 
                    }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </template>