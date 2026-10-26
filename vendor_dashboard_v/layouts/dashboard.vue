<!-- File: layouts/dashboard.vue -->
<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  
  const router = useRouter()
  const route = useRoute()
  const supabase = ref(null)
  
  // ✅ SSR-safe: Use refs instead of Vuetify composables
  const mobile = ref(false)
  const drawer = ref(true)
  const logoutDialog = ref(false)
  const user = ref(null)
  const vendorStatus = ref('loading')
  
  // Computed
  const isMobile = computed(() => mobile.value)
  const currentRoute = computed(() => route.path)
  const currentYear = computed(() => new Date().getFullYear())
  
  const userName = computed(() => {
    if (!user.value) return 'Loading...'
    return user.value.user_metadata?.full_name || 
           user.value.user_metadata?.name || 
           user.value.email?.split('@')[0] || 
           'Vendor'
  })
  
  const userEmail = computed(() => user.value?.email || '')
  
  const userAvatar = computed(() => {
    return user.value?.user_metadata?.avatar_url || 
           user.value?.user_metadata?.picture || 
           null
  })
  
  const userInitials = computed(() => {
    const name = userName.value
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  })
  
  const welcomeText = ref('Welcome Vendor')
  
  // Footer links
  const footerLinks = ref([
    { name: 'About', url: '#' },
    { name: 'Contact', url: '#' },
    { name: 'Terms of Service', url: '#' },
    { name: 'Privacy Policy', url: '#' },
  ])
  
  const socialLinks = ref([
    { name: 'Facebook', icon: 'mdi-facebook', url: '#' },
    { name: 'Twitter', icon: 'mdi-twitter', url: '#' },
    { name: 'Instagram', icon: 'mdi-instagram', url: '#' },
    { name: 'LinkedIn', icon: 'mdi-linkedin', url: '#' },
  ])
  
  // ✅ SSR-safe mobile detection using window resize
  const checkMobile = () => {
    if (import.meta.client) {
      mobile.value = window.innerWidth < 960
      drawer.value = !mobile.value
    }
  }
  
  let resizeListener = null
  
  // Methods
  const handleLogout = () => {
    logoutDialog.value = true
  }
  
  const confirmLogout = async () => {
    try {
      const { error } = await supabase.value.auth.signOut()
      if (error) throw error
      
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to logout. Please try again.')
    } finally {
      logoutDialog.value = false
    }
  }
  
  const handleNavigation = (path) => {
    console.log('🔵 Navigation clicked:', path)
    console.log('📍 Current route:', route.path)
    console.log('✅ Vendor status:', vendorStatus.value)
    
    router.push(path)
      .then(() => {
        console.log('✅ Navigation successful to:', path)
      })
      .catch((error) => {
        console.error('❌ Navigation error:', error)
      })
  }
  
  onMounted(async () => {
    console.log('🟢 Dashboard layout mounted')
    console.log('📍 Initial route:', route.path)
    
    // ✅ Initialize Supabase
    const nuxtApp = useNuxtApp()
    supabase.value = nuxtApp.$supabase.client
    
    // ✅ Setup mobile detection with resize listener
    if (import.meta.client) {
      checkMobile()
      resizeListener = () => checkMobile()
      window.addEventListener('resize', resizeListener)
    }
    
    const { data: { user: currentUser } } = await supabase.value.auth.getUser()
    user.value = currentUser
    
    console.log('👤 User loaded:', currentUser?.email)
    
    if (currentUser) {
      try {
        const { data: vendor } = await supabase.value
          .from('vendors')
          .select('company_name, status, onboarding_completed, id')
          .eq('user_id', currentUser.id)
          .maybeSingle()
        
        console.log('🏢 Vendor data:', vendor)
        
        if (vendor?.company_name) {
          welcomeText.value = vendor.company_name
        }
  
        if (vendor) {
          const { data: documents } = await supabase.value
            .from('vendor_documents')
            .select('document_type, status, document_category')
            .eq('vendor_id', vendor.id)
  
          console.log('📄 Documents:', documents)
  
          const hasPAN = documents?.some(d => d.document_type === 'pan_card' && d.status === 'approved')
          const hasAadhaar = documents?.some(d => d.document_type === 'aadhaar_card' && d.status === 'approved')
          const hasPassbook = documents?.some(d => d.document_type === 'passbook' && d.status === 'approved')
          const hasCertificate = documents?.some(d => d.document_category === 'activity_license' && d.status === 'approved')
  
          const allDocsApproved = hasPAN && hasAadhaar && hasPassbook && hasCertificate
  
          console.log('📋 Document status:', { hasPAN, hasAadhaar, hasPassbook, hasCertificate, allDocsApproved })
  
          if (vendor.status === 'approved' && vendor.onboarding_completed && allDocsApproved) {
            vendorStatus.value = 'approved'
            console.log('✅ Vendor status: APPROVED - Showing all navigation')
          } else {
            vendorStatus.value = 'pending'
            console.log('⏳ Vendor status: PENDING')
            
            // Redirect to onboarding if not approved and trying to access dashboard
            if (route.path.startsWith('/dashboard') && route.path !== '/onboarding') {
              console.log('🔄 Redirecting to onboarding from:', route.path)
              router.push('/onboarding')
            }
          }
        } else {
          console.log('⚠️ No vendor record found')
          vendorStatus.value = 'pending'
          router.push('/onboarding')
        }
      } catch (error) {
        console.error('❌ Error fetching vendor data:', error)
      }
    }
  })
  
  onBeforeUnmount(() => {
    if (import.meta.client && resizeListener) {
      window.removeEventListener('resize', resizeListener)
    }
  })
  </script>
  
  <template>
    <v-app>
      <!-- App Bar -->
      <v-app-bar
        color="primary"
        prominent
        elevation="2"
        :height="isMobile ? 56 : 64"
      >
        <v-app-bar-nav-icon
          v-if="isMobile"
          @click="drawer = !drawer"
          class="text-white"
        />
  
        <v-spacer v-if="!isMobile" />
  
        <v-app-bar-title class="text-center flex-grow-1">
          <span class="text-h6 font-weight-medium text-white">
            {{ welcomeText }}
          </span>
        </v-app-bar-title>
  
        <v-spacer />
      </v-app-bar>
  
      <!-- Navigation Drawer -->
      <v-navigation-drawer
        v-model="drawer"
        :permanent="!isMobile"
        :temporary="isMobile"
        width="280"
        color="grey-lighten-5"
      >
        <!-- User Profile Section -->
        <v-list density="compact" nav class="pt-4">
          <v-list-item
            :prepend-avatar="userAvatar"
            :title="userName"
            :subtitle="userEmail"
            class="mb-2"
          >
            <template v-slot:prepend>
              <v-avatar color="primary" size="40">
                <v-img v-if="userAvatar" :src="userAvatar" />
                <span v-else class="text-h6 text-white">
                  {{ userInitials }}
                </span>
              </v-avatar>
            </template>
          </v-list-item>
        </v-list>
  
        <v-divider class="mb-2" />
  
        <!-- Navigation Menu -->
        <v-list density="compact" nav>
          <!-- ✅ Show ALL navigation when approved -->
          <template v-if="vendorStatus === 'approved'">
            <!-- Dashboard -->
            <v-list-item
              prepend-icon="mdi-view-dashboard"
              title="Dashboard"
              value="dashboard"
              :active="currentRoute === '/dashboard'"
              @click="handleNavigation('/dashboard')"
              class="mb-1"
              rounded="lg"
            />
  
            <!-- Create Activity -->
            <v-list-item
              prepend-icon="mdi-plus-circle"
              title="Create Activity"
              value="create-activity"
              :active="currentRoute === '/dashboard/create-activity'"
              @click="handleNavigation('/dashboard/create-activity')"
              class="mb-1"
              rounded="lg"
            />
  
            <!-- Current Activities -->
            <v-list-item
              prepend-icon="mdi-format-list-bulleted"
              title="Current Activities"
              value="activities"
              :active="currentRoute === '/dashboard/activities'"
              @click="handleNavigation('/dashboard/activities')"
              class="mb-1"
              rounded="lg"
            />
  
            <!-- Bookings -->
            <v-list-item
              prepend-icon="mdi-calendar-check"
              title="Bookings"
              value="bookings"
              :active="currentRoute === '/dashboard/bookings'"
              @click="handleNavigation('/dashboard/bookings')"
              class="mb-1"
              rounded="lg"
            />
  
            <!-- Analytics -->
            <v-list-item
              prepend-icon="mdi-chart-line"
              title="Analytics"
              value="analytics"
              :active="currentRoute === '/dashboard/analytics'"
              @click="handleNavigation('/dashboard/analytics')"
              class="mb-1"
              rounded="lg"
            />
  
            <v-divider class="my-2" />
  
            <!-- Contact Us -->
            <v-list-item
              prepend-icon="mdi-email-outline"
              title="Contact Us"
              value="contact"
              :active="currentRoute === '/dashboard/contact'"
              @click="handleNavigation('/dashboard/contact')"
              class="mb-1"
              rounded="lg"
            />
          </template>
  
          <!-- ✅ Only show Onboarding if NOT approved -->
          <template v-else-if="vendorStatus === 'pending'">
            <v-list-item
              prepend-icon="mdi-clipboard-check-outline"
              title="Onboarding"
              value="onboarding"
              :active="currentRoute === '/onboarding'"
              @click="handleNavigation('/onboarding')"
              class="mb-1"
              rounded="lg"
            />
          </template>
  
          <!-- Loading state -->
          <template v-else>
            <v-list-item>
              <v-list-item-title class="text-center">
                <v-progress-circular indeterminate size="24" width="2" />
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
  
        <!-- Spacer to push logout to bottom -->
        <template v-slot:append>
          <v-divider class="mb-2" />
          
          <!-- Logout -->
          <v-list density="compact" nav>
            <v-list-item
              prepend-icon="mdi-logout"
              title="Logout"
              value="logout"
              @click="handleLogout"
              class="text-error"
              rounded="lg"
            />
          </v-list>
        </template>
      </v-navigation-drawer>
  
      <!-- Main Content -->
      <v-main class="bg-grey-lighten-4">
        <v-container fluid class="pa-4 pa-md-6">
          <slot />
        </v-container>
      </v-main>
  
      <!-- Footer -->
      <v-footer
        color="grey-darken-3"
        class="text-center d-flex flex-column py-4"
        app
      >
        <div class="d-flex flex-wrap justify-center mb-3 gap-4">
          <a
            v-for="link in footerLinks"
            :key="link.name"
            :href="link.url"
            class="text-white text-decoration-none text-caption hover:text-primary"
            target="_blank"
          >
            {{ link.name }}
          </a>
        </div>
  
        <div class="d-flex justify-center mb-3 gap-3">
          <v-btn
            v-for="social in socialLinks"
            :key="social.name"
            :icon="social.icon"
            size="small"
            variant="text"
            color="white"
            :href="social.url"
            target="_blank"
          />
        </div>
  
        <div class="text-caption text-white opacity-80">
          © {{ currentYear }} NeoTrips. All rights reserved.
        </div>
      </v-footer>
  
      <!-- Logout Confirmation Dialog -->
      <v-dialog v-model="logoutDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">Confirm Logout</v-card-title>
          <v-card-text>Are you sure you want to logout?</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="logoutDialog = false">Cancel</v-btn>
            <v-btn color="error" variant="flat" @click="confirmLogout">
              Logout
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-app>
  </template>
  
  <style scoped>
  a.hover\:text-primary:hover {
    color: rgb(var(--v-theme-primary)) !important;
    transition: color 0.2s ease;
  }
  
  .v-main {
    min-height: calc(100vh - 64px - 80px);
  }
  
  @media (max-width: 600px) {
    .v-main {
      min-height: calc(100vh - 56px - 120px);
    }
  }
  </style>