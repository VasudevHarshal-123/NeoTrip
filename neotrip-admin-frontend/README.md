# NeoTrip Admin Frontend

Nuxt 3 admin dashboard with Vuetify for managing NeoTrip adventure tourism marketplace.

## 🚀 Quick Start

### Prerequisites
- Node.js v20.x or higher
- npm v9.x or higher
- Backend API running (see backend README)

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon/public key
- `API_BASE_URL` - Backend API URL (default: http://localhost:3001)

3. **Start development server**
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

### Production Build
```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
neotrip-admin-frontend/
├── assets/
│   └── css/
│       └── main.css              # Global styles
├── components/                   # Reusable Vue components
├── composables/
│   ├── useSupabase.ts            # Supabase client
│   └── useApi.ts                 # Backend API client
├── layouts/
│   ├── auth.vue                  # Auth pages layout
│   └── default.vue               # Dashboard layout with sidebar
├── middleware/
│   ├── auth.ts                   # Protected route middleware
│   └── guest.ts                  # Guest-only middleware
├── pages/
│   ├── login.vue                 # Login page
│   ├── dashboard.vue             # Dashboard home
│   └── vendors/
│       └── index.vue             # Vendors listing
├── plugins/
│   ├── vuetify.ts                # Vuetify configuration
│   └── toast.client.ts           # Toast notifications
├── stores/
│   └── auth.ts                   # Pinia auth store
├── nuxt.config.ts                # Nuxt configuration
├── package.json
└── README.md
```

---

## 🔑 Authentication

### Login Flow
1. User enters email and password on `/login`
2. Credentials sent to backend API `/api/v1/auth/login`
3. Backend verifies with Supabase and checks admin status
4. On success, JWT token stored in localStorage
5. User redirected to `/dashboard`

### Token Management
- Access token stored in `localStorage` as `admin_token`
- Refresh token stored as `admin_refresh_token`
- Tokens automatically included in API requests
- Auto-refresh on token expiration (handled by backend)

### Protected Routes
All routes except `/login` require authentication via `auth` middleware.

---

## 🎨 UI Components (Vuetify 3)

### Available Components
- **Buttons**: `<v-btn>`, `<v-btn-toggle>`
- **Cards**: `<v-card>`, `<v-card-title>`, `<v-card-text>`
- **Forms**: `<v-text-field>`, `<v-select>`, `<v-textarea>`
- **Data**: `<v-data-table>`, `<v-pagination>`
- **Navigation**: `<v-app-bar>`, `<v-navigation-drawer>`
- **Feedback**: `<v-snackbar>`, `<v-alert>`, `<v-progress-linear>`
- **Layout**: `<v-container>`, `<v-row>`, `<v-col>`

### Icons
Material Design Icons available via `mdi-` prefix:
```vue
<v-icon icon="mdi-account" />
```

Browse icons: https://pictogrammers.com/library/mdi/

### Theming
Theme configured in `plugins/vuetify.ts`:
- Primary: #1976D2 (Blue)
- Success: #4CAF50 (Green)
- Error: #FF5252 (Red)
- Warning: #FFC107 (Amber)

---

## 📡 API Integration

### Using the API Composable

```vue
<script setup>
const api = useApi()

// Fetch vendors
const vendors = await api.vendors.list({ page: 1, limit: 10 })

// Approve vendor
await api.vendors.approve(vendorId, 'Approved by admin')

// Fetch bookings
const bookings = await api.bookings.list({ status: 'confirmed' })
</script>
```

### Available API Methods

**Auth**
- `api.auth.login(credentials)`
- `api.auth.me()`
- `api.auth.logout()`
- `api.auth.changePassword(passwords)`

**Vendors**
- `api.vendors.list(params)`
- `api.vendors.get(id)`
- `api.vendors.approve(id, notes)`
- `api.vendors.reject(id, notes)`
- `api.vendors.suspend(id, reason)`
- `api.vendors.stats()`

**Bookings**
- `api.bookings.list(params)`
- `api.bookings.get(id)`
- `api.bookings.cancel(id, data)`
- `api.bookings.stats()`

**Settlements**
- `api.settlements.list(params)`
- `api.settlements.get(id)`
- `api.settlements.approve(id, notes)`
- `api.settlements.complete(id, data)`
- `api.settlements.stats()`

---

## 🔐 Authentication Store (Pinia)

### Usage

```vue
<script setup>
const authStore = useAuthStore()

// Check authentication
if (authStore.isAuthenticated) {
  // User is logged in
}

// Check permissions
if (authStore.hasPermission('vendors')) {
  // User can manage vendors
}

// Check admin role
if (authStore.isSuperAdmin) {
  // User is super admin
}

// Logout
await authStore.logout()
</script>
```

### Available Properties
- `user` - Current user object
- `token` - JWT access token
- `adminRole` - Admin role (super_admin, finance, operations, support)
- `permissions` - Permissions object
- `isAuthenticated` - Boolean

### Available Getters
- `isSuperAdmin` - Is super admin
- `isFinance` - Is finance admin
- `isOperations` - Is operations admin
- `isSupport` - Is support admin
- `hasPermission(permission)` - Check specific permission
- `canApproveVendors` - Can approve/reject vendors
- `canManageSettlements` - Can manage settlements

### Available Actions
- `login(email, password)` - Login user
- `logout()` - Logout user
- `fetchUserInfo()` - Refresh user info
- `changePassword(currentPassword, newPassword)` - Change password

---

## 🍞 Toast Notifications

### Usage

```vue
<script setup>
const { $toast } = useNuxtApp()

// Success message
$toast.success('Operation successful!')

// Error message
$toast.error('Something went wrong')

// Warning message
$toast.warning('Please review before continuing')

// Info message
$toast.info('Here is some information')
</script>
```

---

## 📝 Form Validation (Vee-Validate + Zod)

### Example

```vue
<script setup>
import { useField, useForm } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'

// Define schema
const schema = toTypedSchema(
  z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    email: z.string().email('Invalid email'),
    age: z.number().min(18, 'Must be 18 or older')
  })
)

// Setup form
const { handleSubmit } = useForm({ validationSchema: schema })

// Setup fields
const { value: name, errorMessage: nameError } = useField('name')
const { value: email, errorMessage: emailError } = useField('email')

// Handle submit
const onSubmit = handleSubmit(async (values) => {
  console.log('Form values:', values)
})
</script>

<template>
  <v-form @submit.prevent="onSubmit">
    <v-text-field
      v-model="name"
      label="Name"
      :error-messages="nameError"
    />
    
    <v-text-field
      v-model="email"
      label="Email"
      :error-messages="emailError"
    />
    
    <v-btn type="submit">Submit</v-btn>
  </v-form>
</template>
```

---

## 🎯 Creating New Pages

### 1. Create page file
```bash
# Create new page
touch pages/bookings.vue
```

### 2. Add route protection
```vue
<script setup>
definePageMeta({
  middleware: 'auth'  // Require authentication
})
</script>
```

### 3. Add to navigation
Edit `layouts/default.vue` and add navigation item:
```vue
<v-list-item
  prepend-icon="mdi-calendar"
  title="Bookings"
  to="/bookings"
/>
```

---

## 🛠️ Development Tips

### Hot Module Replacement
Changes to `.vue` files automatically reload in browser.

### Vue DevTools
Install Vue DevTools browser extension for debugging.

### Console Logging
```javascript
console.log('Debug:', data)
```

### API Error Handling
All API errors are automatically caught and displayed as toast notifications.

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'vuetify'"
**Solution**: Run `npm install` again

### Issue: Login redirects immediately
**Solution**: Clear localStorage in browser DevTools > Application > Local Storage

### Issue: API returns 401 Unauthorized
**Solution**: Check `API_BASE_URL` in `.env` and ensure backend is running

### Issue: Vuetify components not rendering
**Solution**: Ensure `plugins/vuetify.ts` is imported correctly

### Issue: Dark theme not working
**Solution**: Toggle theme in Vuetify configuration

---

## 📱 Responsive Design

Vuetify uses Material Design breakpoints:
- `xs`: < 600px (Mobile)
- `sm`: 600px - 960px (Tablet)
- `md`: 960px - 1280px (Desktop)
- `lg`: 1280px - 1920px (Large Desktop)
- `xl`: > 1920px (Extra Large)

### Usage
```vue
<v-col cols="12" sm="6" md="4" lg="3">
  <!-- Responsive column -->
</v-col>
```

---

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

---

## 📊 Performance Optimization

### Lazy Loading
```vue
<script setup>
// Lazy load component
const MyComponent = defineAsyncComponent(() =>
  import('~/components/MyComponent.vue')
)
</script>
```

### Image Optimization
Use Nuxt Image module for optimized images.

---

## 🔒 Security Best Practices

1. **Never commit `.env` file**
2. **Always validate user input**
3. **Use HTTPS in production**
4. **Keep dependencies updated**
5. **Implement rate limiting on forms**
6. **Sanitize user-generated content**

---

## 👥 Admin Roles & Permissions

- **super_admin**: Full access to all features
- **finance**: Settlements and financial reports
- **operations**: Vendor and booking management
- **support**: Read-only access

---

## 📞 Support

For issues or questions, contact the development team.

---

## 📚 Additional Resources

- [Nuxt 3 Documentation](https://nuxt.com)
- [Vuetify 3 Documentation](https://vuetifyjs.com)
- [Pinia Documentation](https://pinia.vuejs.org)
- [Vee-Validate Documentation](https://vee-validate.logaretm.com)
- [Zod Documentation](https://zod.dev)
