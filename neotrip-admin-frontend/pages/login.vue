<template>
  <div class="login-page">
    <v-card elevation="0" class="pa-8">
      <div class="text-center mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">Admin Login</h1>
        <p class="text-body-1 text-grey">Enter your credentials to access the dashboard</p>
      </div>

      <v-form @submit.prevent="handleLogin">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          prepend-inner-icon="mdi-email"
          :error-messages="emailError"
          :disabled="loading"
          required
          class="mb-4"
        />

        <v-text-field
          v-model="password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock"
          :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="showPassword = !showPassword"
          :error-messages="passwordError"
          :disabled="loading"
          required
          class="mb-6"
        />

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :loading="loading"
          :disabled="loading"
        >
          Login
        </v-btn>
      </v-form>

      <!-- Error message -->
      <v-alert
        v-if="errorMessage"
        type="error"
        class="mt-4"
        closable
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>
    </v-card>
  </div>
</template>

<script setup>
import { useField, useForm } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const authStore = useAuthStore()
const { $toast } = useNuxtApp()

// Form state
const loading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

// Validation schema
const loginSchema = toTypedSchema(
  z.object({
    email: z.string().email('Invalid email address').min(1, 'Email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
)

// Setup form validation
const { handleSubmit, errors } = useForm({
  validationSchema: loginSchema
})

// Form fields
const { value: email, errorMessage: emailError } = useField('email')
const { value: password, errorMessage: passwordError } = useField('password')

// Handle login
const handleLogin = handleSubmit(async (values) => {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await authStore.login(values.email, values.password)

    if (result.success) {
      $toast.success('Login successful!')
      await navigateTo('/dashboard')
    } else {
      errorMessage.value = result.error || 'Login failed. Please check your credentials.'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.login-page {
  width: 100%;
}
</style>
