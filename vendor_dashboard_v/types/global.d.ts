// types/global.d.ts
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useSupabase } from '~/composables/useSupabase';


declare global {
  const useSupabaseClient: () => SupabaseClient
  const useSupabaseUser: () => any
  const useRouter: () => Router
  const useRoute: () => RouteLocationNormalizedLoaded
  const navigateTo: (to: string) => Promise<void>
  const definePageMeta: (meta: any) => void
  const useDisplay: () => { mobile: any }
}

export {}
