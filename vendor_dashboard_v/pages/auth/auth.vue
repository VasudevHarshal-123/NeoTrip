<!-- auth.vue -->

<script setup>
const email = ref('')
const password = ref('')
const { signUp, signIn, signInWithGoogle } = useSupabaseAuth()
const message = ref('')

const handleSignUp = async () => {
  const { error } = await signUp(email.value, password.value)
  message.value = error ? error.message : 'Check your inbox for verification!'
}

const handleSignIn = async () => {
  const { error } = await signIn(email.value, password.value)
  message.value = error ? error.message : 'Signed in!'
}
</script>

<template>
  <div class="p-6 space-y-3">
    <h2 class="text-xl font-semibold">Supabase Auth Test</h2>
    <input v-model="email" placeholder="Email" class="border p-2 w-64" />
    <input v-model="password" placeholder="Password" type="password" class="border p-2 w-64" />
    <div class="flex space-x-2">
      <button @click="handleSignUp" class="bg-blue-500 text-white px-3 py-1 rounded">Sign Up</button>
      <button @click="handleSignIn" class="bg-green-500 text-white px-3 py-1 rounded">Sign In</button>
      <button @click="signInWithGoogle" class="bg-red-500 text-white px-3 py-1 rounded">Google</button>
    </div>
    <p>{{ message }}</p>
  </div>
</template>
