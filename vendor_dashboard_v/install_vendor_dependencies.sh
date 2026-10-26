#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="vendor_dashboard_v"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: '$PROJECT_DIR' does not exist. Run create_project_folder.sh first."
  exit 1
fi

echo "▶ Initializing Nuxt app in ./$PROJECT_DIR"
npx nuxi@latest init "$PROJECT_DIR"

cd "$PROJECT_DIR"
echo "▶ Working in: $(pwd)"

# Choose package manager (prefer yarn if available)
if command -v yarn >/dev/null 2>&1; then
  PM="yarn"
else
  PM="npm"
fi
echo "▶ Using package manager: $PM"

echo "▶ Pinning core versions (same as podcast project)"
$PM add -D nuxt@3.16.2
$PM add vue@3.5.13 pinia@2.1.7 @pinia/nuxt@0.5.1 vuetify@3.8.2 @nuxtjs/i18n@9.5.3
$PM add -D tailwindcss@3.4.3 postcss@8 autoprefixer@10

echo "▶ Tailwind v3 setup"
npx tailwindcss init -p

cat > tailwind.config.js <<'EOF'
module.exports = {
  content: [
    "./app/**/*.{vue,js,ts}",
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.{vue,js,ts}",
    "./pages/**/*.{vue,js,ts}",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}"
  ],
  theme: { extend: {} },
  plugins: []
}
EOF

cat > postcss.config.js <<'EOF'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
EOF

mkdir -p assets/css
cat > assets/css/tailwind.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

echo "▶ nuxt.config.ts (modules, css, alias, runtimeConfig, i18n)"
cat > nuxt.config.ts <<'EOF'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],
  css: ['vuetify/styles', '@/assets/css/tailwind.css'],
  build: { transpile: ['vuetify'] },
  alias: { '@': '.', '~': '.' },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api'
    }
  },
  i18n: {
    locales: [{ code: 'en', iso: 'en-US', name: 'English' }],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    vueI18n: './i18n.config.js'
  },
  compatibilityDate: '2024-07-01'
})
EOF

echo "▶ i18n.config.js"
cat > i18n.config.js <<'EOF'
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: { en: { hello: 'Hello' } }
}))
EOF

echo "▶ Vuetify plugin (JS)"
mkdir -p plugins
cat > plugins/vuetify.js <<'EOF'
import { defineNuxtPlugin } from '#app'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({ components, directives })
  nuxtApp.vueApp.use(vuetify)
})
EOF

echo "▶ Pinia store + REST helper"
mkdir -p stores composables
cat > stores/app.js <<'EOF'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({ user: null }),
  actions: {
    setUser(u) {
      this.user = u
    }
  }
})
EOF

cat > composables/useApi.js <<'EOF'
export function useApi(path, opts = {}) {
  const baseURL = useRuntimeConfig().public.apiBase
  return useFetch(path, { baseURL, ...opts })
}
EOF

echo "▶ Default layout + index page"
mkdir -p pages layouts

cat > layouts/default.vue <<'EOF'
<template>
  <div class="min-h-screen bg-white text-slate-800">
    <slot />
  </div>
</template>
EOF

cat > pages/index.vue <<'EOF'
<script setup>
const { data } = await useApi('/health', { default: () => ({ ok: true }) })
</script>

<template>
  <main class="p-6 space-y-4">
    <h1 class="text-2xl font-semibold">vendor_dashboard_v (Nuxt 3)</h1>
    <p>REST base: {{ useRuntimeConfig().public.apiBase }}</p>
    <v-btn color="primary">Vuetify button</v-btn>
    <pre class="bg-gray-100 p-2 rounded">health: {{ data }}</pre>
  </main>
</template>
EOF

echo "▶ .env.example"
cat > .env.example <<'EOF'
NUXT_PUBLIC_API_BASE=http://localhost:3000/api
EOF

echo "▶ Installing dependencies…"
$PM install

echo "✅ Done."
echo "To run the app:"
echo "  cd vendor_dashboard_v"
echo "  $PM dev"
