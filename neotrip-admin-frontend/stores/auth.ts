import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    refreshToken: null,
    adminRole: null,
    permissions: {},
    isAuthenticated: false,
    loading: false
  }),

  getters: {
    isSuperAdmin: (state) => state.adminRole === 'super_admin',
    isFinance: (state) => state.adminRole === 'finance',
    isOperations: (state) => state.adminRole === 'operations',
    isSupport: (state) => state.adminRole === 'support',
    
    hasPermission: (state) => (permission) => {
      if (state.adminRole === 'super_admin') return true
      return state.permissions[permission] === true
    },

    canApproveVendors: (state) => {
      return state.adminRole === 'super_admin' || state.permissions.vendors === true
    },

    canManageSettlements: (state) => {
      return state.adminRole === 'super_admin' || state.adminRole === 'finance'
    }
  },

  actions: {
    /**
     * Initialize auth from localStorage
     */
    async init() {
      if (import.meta.server) return

      const token = localStorage.getItem('admin_token')
      const refreshToken = localStorage.getItem('admin_refresh_token')
      const user = localStorage.getItem('admin_user')

      if (token && user) {
        this.token = token
        this.refreshToken = refreshToken
        this.user = JSON.parse(user)
        this.isAuthenticated = true

        // Verify token is still valid
        try {
          await this.fetchUserInfo()
        } catch (error) {
          console.error('Token validation failed:', error)
          this.logout()
        }
      }
    },

    /**
     * Login with email and password
     */
    async login(email, password) {
      this.loading = true
      
      try {
        const { supabase } = useSupabase()
        
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        // Verify admin status via backend API
        const api = useApi()
        const response = await api.auth.login({ email, password })

        if (!response.success) {
          throw new Error(response.error || 'Login failed')
        }

        // Store auth data
        this.setAuthData(response.data)

        return { success: true }
      } catch (error) {
        console.error('Login error:', error)
        return {
          success: false,
          error: error.message || 'Login failed'
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * Set authentication data
     */
    setAuthData(data) {
      this.user = data.user
      this.token = data.session.access_token
      this.refreshToken = data.session.refresh_token
      this.adminRole = data.user.role
      this.permissions = data.user.permissions || {}
      this.isAuthenticated = true

      // Store in localStorage
      if (import.meta.client) {
        localStorage.setItem('admin_token', this.token)
        localStorage.setItem('admin_refresh_token', this.refreshToken)
        localStorage.setItem('admin_user', JSON.stringify(this.user))
      }
    },

    /**
     * Fetch current user info
     */
    async fetchUserInfo() {
      try {
        const api = useApi()
        const response = await api.auth.me()

        if (response.success) {
          this.user = response.data.user
          this.adminRole = response.data.adminRole
          this.permissions = response.data.permissions

          if (import.meta.client) {
            localStorage.setItem('admin_user', JSON.stringify(this.user))
          }
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
        throw error
      }
    },

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
      if (!this.refreshToken) {
        throw new Error('No refresh token available')
      }

      try {
        const api = useApi()
        const response = await api.auth.refresh(this.refreshToken)

        this.token = response.data.access_token
        this.refreshToken = response.data.refresh_token

        if (import.meta.client) {
          localStorage.setItem('admin_token', this.token)
          localStorage.setItem('admin_refresh_token', this.refreshToken)
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.logout()
        throw error
      }
    },

    /**
     * Logout
     */
    async logout() {
      try {
        const { supabase } = useSupabase()
        await supabase.auth.signOut()

        // Clear backend session
        if (this.token) {
          const api = useApi()
          await api.auth.logout().catch(() => {})
        }
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        // Clear state
        this.user = null
        this.token = null
        this.refreshToken = null
        this.adminRole = null
        this.permissions = {}
        this.isAuthenticated = false

        // Clear localStorage
        if (import.meta.client) {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_refresh_token')
          localStorage.removeItem('admin_user')
        }

        // Redirect to login
        navigateTo('/login')
      }
    },

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
      try {
        const api = useApi()
        const response = await api.auth.changePassword({
          currentPassword,
          newPassword
        })

        return { success: true, message: response.message }
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Failed to change password'
        }
      }
    }
  },

  // Persist state
  persist: false // We're manually handling localStorage
})
