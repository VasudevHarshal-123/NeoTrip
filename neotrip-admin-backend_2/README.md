# NeoTrip Admin Backend

Express.js API for NeoTrip Admin Dashboard with Supabase integration.

## 🚀 Quick Start

### Prerequisites
- Node.js v20.x or higher
- npm v9.x or higher
- Supabase project with database schema deployed

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (⚠️ Keep secret!)
- `JWT_SECRET` - Random secret for JWT signing
- `ALLOWED_ORIGINS` - Frontend URL (e.g., http://localhost:3000)

3. **Create first admin user** (See SQL section below)

4. **Start development server**
```bash
npm run dev
```

Server will run on `http://localhost:3001`

### Production Deployment
```bash
npm start
```

---

## 📁 Project Structure

```
neotrip-admin-backend/
├── src/
│   ├── config/
│   │   ├── logger.js           # Winston logger configuration
│   │   └── supabase.js          # Supabase client setup
│   ├── middleware/
│   │   ├── auth.js              # Authentication & authorization
│   │   ├── errorHandler.js      # Error handling
│   │   ├── validation.js        # Request validation (Zod)
│   │   └── notFound.js          # 404 handler
│   └── routes/
│       └── v1/
│           ├── auth.routes.js   # Authentication endpoints
│           ├── vendor.routes.js # Vendor management
│           ├── booking.routes.js # Booking management
│           └── settlement.routes.js # Settlement management
├── logs/                         # Log files (production)
├── server.js                     # Express server entry point
├── package.json
├── .env.example
└── README.md
```

---

## 🔑 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Admin login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/change-password` - Change password

### Vendor Management
- `GET /api/v1/vendors` - List all vendors (with counts)
- `GET /api/v1/vendors/:id` - Get comprehensive vendor details
- `GET /api/v1/vendors/:id/activities` - Get vendor activities
- `GET /api/v1/vendors/:id/documents` - Get vendor documents
- `GET /api/v1/vendors/:id/listings` - Get vendor listings
- `PUT /api/v1/vendors/:id/approve` - Approve vendor profile
- `PUT /api/v1/vendors/:id/reject` - Reject vendor profile
- `PUT /api/v1/vendors/:id/suspend` - Suspend vendor
- `PUT /api/v1/vendors/documents/:documentId/approve` - Approve document
- `PUT /api/v1/vendors/documents/:documentId/reject` - Reject document
- `PUT /api/v1/vendors/activities/:activityId/approve` - Approve activity
- `PUT /api/v1/vendors/activities/:activityId/reject` - Reject activity
- `GET /api/v1/vendors/stats/overview` - Vendor statistics

### Bookings
- `GET /api/v1/bookings` - List all bookings (with filters)
- `GET /api/v1/bookings/:id` - Get booking details
- `PUT /api/v1/bookings/:id/cancel` - Cancel booking
- `GET /api/v1/bookings/stats/overview` - Booking statistics

### Settlements
- `GET /api/v1/settlements` - List all settlements (with filters)
- `GET /api/v1/settlements/:id` - Get settlement details
- `PUT /api/v1/settlements/:id/approve` - Approve settlement
- `PUT /api/v1/settlements/:id/complete` - Complete settlement
- `GET /api/v1/settlements/stats/overview` - Settlement statistics

### Health Check
- `GET /health` - Server health check

**📖 For detailed API documentation, see: `docs/API_DOCUMENTATION.md`**

---

## 🔐 Authentication Flow

1. **Login**: Admin logs in with email/password
2. **Token**: Supabase returns JWT access_token
3. **Authorization**: Frontend sends token in header: `Authorization: Bearer <token>`
4. **Verification**: Backend verifies token and checks admin status
5. **Permissions**: Backend checks admin role and permissions for specific actions

---

## 🛡️ Security Features

- **Helmet.js** - Security headers
- **CORS** - Configurable origin whitelist
- **Rate Limiting** - 100 requests per 15 minutes
- **Input Validation** - Zod schema validation
- **Input Sanitization** - XSS protection
- **JWT Verification** - Token-based authentication
- **RLS Bypass** - Service role for admin operations
- **Audit Logging** - All admin actions logged

---

## 📝 Admin User Setup

### SQL Script to Create First Admin

Run this SQL in your Supabase SQL Editor:

```sql
-- 1. First, sign up a regular user via Supabase Auth
--    (Use Supabase Dashboard > Authentication > Add User)
--    Email: admin@neotrip.com
--    Password: YourSecurePassword123

-- 2. Get the user ID and run this:
UPDATE public.users 
SET user_type = 'admin'
WHERE email = 'admin@neotrip.com';

-- 3. Create admin role entry
INSERT INTO public.admin_roles (user_id, role, permissions, created_by)
SELECT 
  id,
  'super_admin',
  '{
    "vendors": true,
    "bookings": true,
    "settlements": true,
    "users": true,
    "reports": true
  }'::jsonb,
  id
FROM public.users
WHERE email = 'admin@neotrip.com';

-- 4. Verify admin user
SELECT 
  u.id,
  u.email,
  u.user_type,
  ar.role,
  ar.permissions
FROM public.users u
LEFT JOIN public.admin_roles ar ON ar.user_id = u.id
WHERE u.email = 'admin@neotrip.com';
```

---

## 🧪 Testing

### Test Authentication
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@neotrip.com",
    "password": "YourSecurePassword123"
  }'
```

### Test Protected Endpoint
```bash
curl -X GET http://localhost:3001/api/v1/vendors \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Troubleshooting

### Issue: CORS Error
**Solution**: Add your frontend URL to `ALLOWED_ORIGINS` in `.env`

### Issue: "Admin access required"
**Solution**: Ensure user has `user_type = 'admin'` in users table

### Issue: Database connection fails
**Solution**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

### Issue: Rate limit exceeded
**Solution**: Adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`

---

## 📊 Logging

Logs are stored in:
- **Development**: Console only
- **Production**: 
  - `logs/error-YYYY-MM-DD.log` - Error logs
  - `logs/combined-YYYY-MM-DD.log` - All logs

Logs rotate daily and are kept for 14 days.

---

## 🚦 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | Environment (development/production) |
| `PORT` | No | Server port (default: 3001) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `JWT_SECRET` | Yes | JWT signing secret |
| `ALLOWED_ORIGINS` | Yes | CORS allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (default: 900000) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |
| `LOG_LEVEL` | No | Logging level (default: info) |

---

## 👥 Admin Roles

- **super_admin**: Full access to all features
- **finance**: Settlements and financial operations
- **operations**: Vendor and booking management
- **support**: Read-only access for customer support

---

---

## 🗄️ Database Schema

The complete database schema includes 24 tables covering:
- User profiles and authentication
- Vendor onboarding and KYC
- Activity listings and scheduling
- Booking management
- Payment processing
- Settlement and payouts
- Admin roles and audit logs

**📖 For complete schema documentation, see: `docs/DATABASE_SCHEMA.md`**

---

## 🔄 Multi-Step Approval Workflow

The admin dashboard uses a 3-step approval process for vendors:

### Step 1: Approve Vendor Profile
```bash
PUT /api/v1/vendors/:id/approve
```
- Verifies basic business information
- Checks bank details
- Updates vendor status to "approved"

### Step 2: Approve Documents
```bash
PUT /api/v1/vendors/documents/:documentId/approve
```
- Approve KYC documents (Aadhaar, PAN, GST)
- Approve activity licenses
- Check document expiry dates
- Each document approved individually

### Step 3: Approve Activities
```bash
PUT /api/v1/vendors/activities/:activityId/approve
```
- Verify vendor has required licenses
- Check activity compliance
- Each activity approved individually

Only after all three steps are complete can a vendor create bookable listings.

---

## 📊 Vendor Listing Response

The `/api/v1/vendors` endpoint returns extended information including:
- Activity counts (total, pending, draft)
- Document counts (total, pending, by category)
- Listing counts (total, draft, approved, active)
- Last login timestamp

---

## 📞 Support

For issues or questions, contact the development team.
