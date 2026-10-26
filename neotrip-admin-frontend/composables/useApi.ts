export const useApi = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const { $toast } = useNuxtApp()

  /**
   * Make authenticated API request
   */
  const request = async (endpoint, options = {}) => {
    const token = authStore.token

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await $fetch(`${config.public.apiBaseUrl}${endpoint}`, {
        ...options,
        headers
      })

      return response
    } catch (error) {
      console.error('API Error:', error)

      // Handle specific error cases
      if (error.statusCode === 401) {
        $toast.error('Session expired. Please login again.')
        await authStore.logout()
        navigateTo('/login')
      } else if (error.statusCode === 403) {
        $toast.error('You do not have permission to perform this action.')
      } else if (error.statusCode === 404) {
        $toast.error('Resource not found.')
      } else if (error.statusCode >= 500) {
        $toast.error('Server error. Please try again later.')
      }

      throw error
    }
  }

  return {
    // Generic request methods
    get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
    put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
    delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),

    // Auth endpoints
    auth: {
      login: (credentials) => request('/api/v1/auth/login', {
        method: 'POST',
        body: credentials
      }),
      refresh: (refreshToken) => request('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken }
      }),
      me: () => request('/api/v1/auth/me'),
      logout: () => request('/api/v1/auth/logout', { method: 'POST' }),
      changePassword: (passwords) => request('/api/v1/auth/change-password', {
        method: 'POST',
        body: passwords
      })
    },

    // Vendor endpoints
    vendors: {
      list: (params) => request(`/api/v1/vendors?${new URLSearchParams(params)}`),
      get: (id) => request(`/api/v1/vendors/${id}`),
      approve: (id, notes) => request(`/api/v1/vendors/${id}/approve`, {
        method: 'PUT',
        body: { approval_notes: notes }
      }),
      reject: (id, notes) => request(`/api/v1/vendors/${id}/reject`, {
        method: 'PUT',
        body: { approval_notes: notes }
      }),
      suspend: (id, reason) => request(`/api/v1/vendors/${id}/suspend`, {
        method: 'PUT',
        body: { reason }
      }),
      stats: () => request('/api/v1/vendors/stats/overview')
    },

    // Booking endpoints
    bookings: {
      list: (params) => request(`/api/v1/bookings?${new URLSearchParams(params)}`),
      get: (id) => request(`/api/v1/bookings/${id}`),
      cancel: (id, data) => request(`/api/v1/bookings/${id}/cancel`, {
        method: 'PUT',
        body: data
      }),
      stats: () => request('/api/v1/bookings/stats/overview')
    },

    // Settlement endpoints
    settlements: {
      list: (params) => request(`/api/v1/settlements?${new URLSearchParams(params)}`),
      get: (id) => request(`/api/v1/settlements/${id}`),
      approve: (id, notes) => request(`/api/v1/settlements/${id}/approve`, {
        method: 'PUT',
        body: { review_notes: notes }
      }),
      complete: (id, data) => request(`/api/v1/settlements/${id}/complete`, {
        method: 'PUT',
        body: data
      }),
      stats: () => request('/api/v1/settlements/stats/overview')
    }
  }
}
