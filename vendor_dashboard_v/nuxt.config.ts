// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config';
import { resolve } from 'node:path';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  devtools: { enabled: false },
  hooks: {
    'ready': (nuxt) => {
      console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing');
      console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Loaded' : '❌ Missing');
    }
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config?.plugins?.push(vuetify({ autoImport: true }));
      });
    },
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
    '@vueuse/nuxt',
  ],

  app: {
    head: {
      title: 'Vendor Dashboard',
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [{
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Mulish:wght@300;400;500;600;700;800&display=swap',
      }],
    },
  },

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    define: { global: 'window' },
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },

  routeRules: {
    '/': { ssr: false },
    '/login': { ssr: false },
    '/onboarding': { ssr: false },
    '/dashboard/**': { ssr: false },
  },

  pinia: {
    storesDirs: ['./store/**'],
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_KEY,
    },
  },
  

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: undefined,
      exclude: ['/'],
      cookieRedirect: false,
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  i18n: {
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  compatibilityDate: '2025-12-03',
});
