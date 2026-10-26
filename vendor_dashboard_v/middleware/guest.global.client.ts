// middleware/guest.global.client.ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  
  if (to.path !== '/login') return;
  
  const nuxtApp = useNuxtApp();
  const supabase = nuxtApp.$supabase;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      return navigateTo('/dashboard');
    }
  } catch (error) {
    console.error('Guest check failed:', error);
  }
});