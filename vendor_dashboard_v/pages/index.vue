<!-- pages/index.vue -->
 
<script setup>
  import { useVendorStore } from '~/store/vendor.store.ts';
  
  definePageMeta({
    name: 'home',
  });
  
  const router = useRouter();
  const vendorStore = useVendorStore();
  const user = ref(null);
  
  onMounted(async () => {
    const nuxtApp = useNuxtApp();
    const supabase = nuxtApp.$supabase.client; // ✅ FIX: Use .client for consistency
    
    const { data } = await supabase.auth.getUser();
    user.value = data.user;
    
    if (!user.value) {
      router.push('/login');
      return;
    }
  
    await vendorStore.fetchVendorData();
  
    const vendorData = vendorStore.vendor;
  
    if (!vendorData) {
      router.push('/onboarding');
      return;
    }
  
    router.push('/dashboard');
  });
  </script>
  

<template>
  <v-container fluid class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="auto">
        <div class="text-center">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
          />
          <p class="text-h6 mt-4">
            Loading...
          </p>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
