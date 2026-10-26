<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height pa-0">
        <v-row no-gutters class="fill-height">
          <!-- Left side - Branding -->
          <v-col
            cols="12"
            md="6"
            class="d-none d-md-flex align-center justify-center primary"
          >
            <div class="text-center px-8">
              <v-icon icon="mdi-airplane-takeoff" size="80" color="white" class="mb-4" />
              <h1 class="text-h3 font-weight-bold white--text mb-4">
                NeoTrip Admin
              </h1>
              <p class="text-h6 white--text">
                Manage your adventure tourism marketplace
              </p>
            </div>
          </v-col>

          <!-- Right side - Auth form -->
          <v-col cols="12" md="6" class="d-flex align-center justify-center">
            <div class="auth-form-container">
              <slot />
            </div>
          </v-col>
        </v-row>
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
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref('info')
const toastTimeout = ref(3000)

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

<style scoped>
.auth-form-container {
  width: 100%;
  max-width: 450px;
  padding: 2rem;
}

@media (max-width: 600px) {
  .auth-form-container {
    padding: 1rem;
  }
}
</style>
