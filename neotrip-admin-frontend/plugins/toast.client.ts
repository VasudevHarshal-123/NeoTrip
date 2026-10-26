// Toast notification composable using Vuetify snackbar
export default defineNuxtPlugin((nuxtApp) => {
  const toast = {
    show(message, options = {}) {
      // This will be implemented in the app layout using Vuetify's v-snackbar
      // For now, we'll use a simple event emitter pattern
      if (import.meta.client) {
        window.dispatchEvent(new CustomEvent('toast-message', {
          detail: {
            message,
            type: options.type || 'info',
            timeout: options.timeout || 3000,
            ...options
          }
        }))
      }
    },

    success(message, options = {}) {
      this.show(message, { ...options, type: 'success' })
    },

    error(message, options = {}) {
      this.show(message, { ...options, type: 'error' })
    },

    warning(message, options = {}) {
      this.show(message, { ...options, type: 'warning' })
    },

    info(message, options = {}) {
      this.show(message, { ...options, type: 'info' })
    }
  }

  return {
    provide: {
      toast
    }
  }
})
