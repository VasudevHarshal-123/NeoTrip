// types/store.ts
export interface VendorState {
    vendor: VendorData | null;
    loading: boolean;
  }
  
  export interface VendorData {
    id: string;
    name: string;
    company_name: string;
    phone?: string;
    email: string;
    user_id: string;
    created_at?: string;
    updated_at?: string;
  }
  