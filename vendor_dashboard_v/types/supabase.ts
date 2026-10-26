// types/supabase.ts
export interface SupabaseAuthResponse {
    data: any;
    error: Error | null;
  }
  
  export interface SupabaseUser {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
  }
  
  export interface AuthCredentials {
    email: string;
    password: string;
  }
  