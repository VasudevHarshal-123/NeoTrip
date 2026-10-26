<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar elevation="1" color="white">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      
      <v-toolbar-title class="font-weight-bold">
        NeoTrip Admin
      </v-toolbar-title>

      <v-spacer />

      <!-- User menu -->
      <v-menu offset-y>
        <template #activator="{ props }">
          <v-btn icon v-bind="props">
            <v-avatar size="36" color="primary">
              <span class="white--text text-subtitle-2">
                {{ userInitials }}
              </span>
            </v-avatar>
          </v-btn>
        </template>
        
        <v-list>
          <v-list-item>
            <v-list-item-title class="font-weight-bold">
              {{ authStore.user?.email }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ authStore.adminRole }}
            </v-list-item-subtitle>
          </v-list-item>
          
          <v-divider />
          
          <v-list-item @click="handleLogout">
            <template #prepend>
              <v-icon icon="mdi-logout" />
            </template>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      app
      color="primary"
      dark
    >
      <v-list nav>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          value="dashboard"
          to="/dashboard"
        />
        
        <v-list-item
          v-if="authStore.hasPermission('vendors')"
          prepend-icon="mdi-store"
          title="Vendors"
          value="vendors"
          to="/vendors"
        />
        
        <v-list-item
          v-if="authStore.hasPermission('bookings')"
          prepend-icon="mdi-calendar-check"
          title="Bookings"
          value="bookings"
          to="/bookings"
        />
        
        <v-list-item
          v-if="authStore.hasPermission('settlements')"
          prepend-icon="mdi-cash-multiple"
          title="Settlements"
          value="settlements"
          to="/settlements"
        />
        
        <v-divider class="my-2" />
        
        <v-list-item
          prepend-icon="mdi-cog"
          title="Settings"
          value="settings"
          to="/settings"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main class="bg-grey-lighten-4">
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>

    <!-- Toast notification -->
    <v-snackbar
      v-model="showToast"
      :color="toastColor"
      :timeout="toastTimeout"
      location="top right"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
const authStore = useAuthStore()
const drawer = ref(true)

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref('info')
const toastTimeout = ref(3000)

// Computed user initials
const userInitials = computed(() => {
  if (!authStore.user?.email) return 'A'
  return authStore.user.email.substring(0, 2).toUpperCase()
})

// Handle logout
const handleLogout = async () => {
  await authStore.logout()
}

// Listen for toast events
if (import.meta.client) {
  window.addEventListener('toast-message', (event) => {
    const { message, type, timeout } = event.detail
    toastMessage.value = message
    toastTimeout.value = timeout || 3000
    
    const colorMap = {
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info'
    }
    toastColor.value = colorMap[type] || 'info'
    
    showToast.value = true
  })
}
</script>
