export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip middleware on server during static generation
  if (import.meta.server) return

  const authStore = useAuthStore()
  
  // Initialize auth state if not already done
  if (!authStore.isAuthenticated && !authStore.loading) {
    await authStore.init()
  }

  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  // Verify admin role
  if (!authStore.user || authStore.user.role !== 'admin') {
    const { $toast } = useNuxtApp()
    $toast.error('Admin access required')
    await authStore.logout()
    return navigateTo('/login')
  }
})
