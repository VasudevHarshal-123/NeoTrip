export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip middleware on server
  if (import.meta.server) return

  const authStore = useAuthStore()
  
  // Initialize auth state if not already done
  if (!authStore.loading) {
    await authStore.init()
  }

  // If user is already authenticated, redirect to dashboard
  if (authStore.isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
