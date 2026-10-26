<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Initialize auth store on app mount
const authStore = useAuthStore()

onMounted(() => {
  authStore.init()
})
</script>
