// File: composables/useSupabaseAuth.ts
// Path: composables/useSupabaseAuth.ts
// Description: Auth composable using nuxtApp.$supabase.client pattern

import type { SupabaseAuthResponse } from '~/types/supabase.ts';
import { ref, onMounted } from 'vue';

export function useSupabaseAuth() {
  const supabaseClient = useSupabase();
  const user = ref(null);

  // Get current user on mount
  onMounted(async () => {
    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    user.value = currentUser;
  });

  const signUp = async (email: string, password: string): Promise<SupabaseAuthResponse> => {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string): Promise<SupabaseAuthResponse> => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signInWithGoogle = async (): Promise<SupabaseAuthResponse> => {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    });
    return { data, error };
  };

  const signOut = async (): Promise<void> => {
    await supabaseClient.auth.signOut();
    user.value = null;
    await navigateTo('/login');
  };

  return { 
    signUp, 
    signIn, 
    signInWithGoogle, 
    signOut,
    user,
  };
}