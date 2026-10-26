// File: composables/useSupabase.ts
// Path: composables/useSupabase.ts
// Description: Standardized Supabase client access - use this everywhere

export function useSupabase() {
    const nuxtApp = useNuxtApp()
    return (nuxtApp.$supabase as { client: any }).client;
  }
