// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // App configuration
  app: {
    head: {
      title: 'NeoTrip Admin Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'NeoTrip Adventure Tourism Admin Dashboard' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  // CSS
  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css',
    '~/assets/css/main.css'
  ],

  // Modules
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],

  // Build configuration
  build: {
    transpile: ['vuetify']
  },

  // Vite configuration
  vite: {
    define: {
      'process.env.DEBUG': false
    },
    ssr: {
      noExternal: ['vuetify']
    }
  },

  // Runtime config
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001'
    }
  },

  // Server-side rendering
  ssr: true,

  // Experimental features
  experimental: {
    payloadExtraction: false
  },

  // Nitro configuration
  nitro: {
    preset: 'node-server'
  },

  // TypeScript configuration
  typescript: {
    strict: false,
    shim: false
  },

  // Pinia configuration
  pinia: {
    autoImports: ['defineStore', 'storeToRefs']
  },

  compatibilityDate: '2024-02-07'
})
