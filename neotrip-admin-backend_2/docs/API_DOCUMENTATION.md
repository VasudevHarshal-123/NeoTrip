# NeoTrip Admin Backend API Documentation

Complete API reference for admin dashboard backend.

---

## Base URL

```
Development: http://localhost:3001
Production: https://your-domain.com
```

---

## Authentication

All admin endpoints require:
1. Valid JWT token from Supabase authentication
2. User must have `user_type = 'admin'` in database
3. Token must be included in request header

```javascript
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## API Endpoints

### 🔐 Authentication

#### POST /api/v1/auth/login
Login admin user.

**Request Body:**
```json
{
  "email": "admin@neotrip.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@neotrip.com",
      "role": "super_admin",
      "permissions": {
        "vendors": true,
        "bookings": true,
        "settlements": true
      }
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_at": 1234567890
    }
  }
}
```

#### POST /api/v1/auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refresh_token": "your_refresh_token"
}
```

#### GET /api/v1/auth/me
Get current admin user info.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@neotrip.com",
      "user_type": "admin"
    },
    "adminRole": "super_admin",
    "permissions": {}
  }
}
```

#### POST /api/v1/auth/logout
Logout admin user.

#### POST /api/v1/auth/change-password
Change admin password.

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

---

### 👥 Vendor Management

#### GET /api/v1/vendors
Get paginated list of all vendors with extended information.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `status` (optional) - Filter by status: pending, approved, rejected, suspended
- `search` (optional) - Search by name, email, company_name, phone
- `sortBy` (optional, default: created_at) - Sort field
- `sortOrder` (optional, default: desc) - Sort direction: asc, desc

**Example Request:**
```
GET /api/v1/vendors?page=1&limit=10&status=pending&sortOrder=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendor-uuid",
        "user_id": "user-uuid",
        "name": "Adventure Tours",
        "email": "vendor@example.com",
        "phone": "9876543210",
        "company_name": "Adventure Co.",
        "status": "pending",
        "onboarding_completed": false,
        "onboarding_step": 3,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "approved_at": null,
        "counts": {
          "total_activities": 5,
          "pending_activities": 2,
          "total_listings": 3,
          "draft_listings": 1,
          "total_documents": 8,
          "pending_documents": 3
        },
        "last_login_at": "2024-01-15T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

#### GET /api/v1/vendors/:id
Get comprehensive vendor details.

**Response:**
```json
{
  "success": true,
  "data": {
    "vendor": {
      "basic_info": {
        "id": "vendor-uuid",
        "user_id": "user-uuid",
        "name": "Adventure Tours",
        "email": "vendor@example.com",
        "phone": "9876543210",
        "company_name": "Adventure Co.",
        "full_name": "John Doe",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "last_login_at": "2024-01-15T09:00:00Z"
      },
      "bank_details": {
        "account_holder_name": "John Doe",
        "account_number": "1234567890",
        "ifsc_code": "HDFC0001234",
        "bank_name": "HDFC Bank",
        "bank_branch": "Mumbai Main",
        "upi_id": "johndoe@paytm",
        "gstin": "27AABCU9603R1ZM",
        "pan_number": "ABCDE1234F"
      },
      "approval_info": {
        "status": "approved",
        "onboarding_completed": true,
        "onboarding_step": 10,
        "approval_notes": "All documents verified",
        "approved_at": "2024-01-16T12:00:00Z",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-16T12:00:00Z"
      },
      "activities": {
        "total": 5,
        "list": [
          {
            "id": "activity-uuid",
            "status": "approved",
            "created_at": "2024-01-15T11:00:00Z",
            "approved_at": "2024-01-16T12:00:00Z",
            "activities_master": {
              "id": "master-uuid",
              "name": "Parasailing",
              "category": "air",
              "slug": "parasailing"
            }
          }
        ],
        "by_status": {
          "pending": 1,
          "approved": 4,
          "rejected": 0
        }
      },
      "listings": {
        "total": 3,
        "list": [
          {
            "id": "listing-uuid",
            "title": "Beach Parasailing Adventure",
            "status": "active",
            "is_published": true,
            "duration_type": "slot",
            "city": "Goa",
            "state": "Goa",
            "created_at": "2024-01-15T14:00:00Z",
            "approved_at": "2024-01-16T13:00:00Z"
          }
        ],
        "by_status": {
          "draft": 0,
          "pending": 0,
          "approved": 2,
          "active": 1
        }
      },
      "documents": {
        "total": 8,
        "list": [
          {
            "id": "doc-uuid",
            "document_category": "vendor_kyc",
            "document_type": "aadhaar",
            "custom_document_name": null,
            "file_url": "https://...",
            "file_name": "aadhaar.jpg",
            "file_size": 524288,
            "status": "approved",
            "has_expiry": false,
            "expiry_date": null,
            "uploaded_at": "2024-01-15T11:30:00Z",
            "approved_at": "2024-01-16T10:00:00Z",
            "approval_notes": null
          }
        ],
        "by_category": {
          "vendor_kyc": 3,
          "activity_license": 5
        },
        "by_status": {
          "pending": 1,
          "approved": 6,
          "rejected": 0,
          "expired": 1
        }
      },
      "statistics": {
        "total_bookings": 25,
        "completed_bookings": 20,
        "total_revenue": 125000.00,
        "average_rating": 4.5,
        "total_reviews": 18
      },
      "commission_settings": {
        "commission_percentage": 15.00,
        "cancellation_window_hours": 48,
        "settlement_cycle": "weekly"
      }
    }
  }
}
```

#### GET /api/v1/vendors/:id/activities
Get all activities for a specific vendor.

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "activity-uuid",
        "vendor_id": "vendor-uuid",
        "activity_id": "master-uuid",
        "status": "approved",
        "approval_notes": null,
        "approved_at": "2024-01-16T12:00:00Z",
        "created_at": "2024-01-15T11:00:00Z",
        "activities_master": {
          "id": "master-uuid",
          "name": "Parasailing",
          "slug": "parasailing",
          "category": "air",
          "description": "...",
          "requires_license": true
        },
        "activity_listings": [
          {
            "id": "listing-uuid",
            "title": "Beach Parasailing",
            "status": "active",
            "is_published": true,
            "created_at": "2024-01-15T14:00:00Z"
          }
        ]
      }
    ]
  }
}
```

#### GET /api/v1/vendors/:id/documents
Get all documents for a specific vendor.

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc-uuid",
        "vendor_id": "vendor-uuid",
        "vendor_activity_id": null,
        "document_category": "vendor_kyc",
        "document_type": "aadhaar",
        "file_url": "https://storage.supabase.co/...",
        "file_name": "aadhaar.jpg",
        "file_size": 524288,
        "status": "approved",
        "has_expiry": false,
        "expiry_date": null,
        "uploaded_at": "2024-01-15T11:30:00Z",
        "approved_at": "2024-01-16T10:00:00Z"
      }
    ]
  }
}
```

#### GET /api/v1/vendors/:id/listings
Get all activity listings created by vendor.

**Response:**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing-uuid",
        "vendor_id": "vendor-uuid",
        "title": "Beach Parasailing Adventure",
        "description": "...",
        "status": "active",
        "is_published": true,
        "city": "Goa",
        "state": "Goa",
        "created_at": "2024-01-15T14:00:00Z",
        "activities_master": {
          "name": "Parasailing",
          "category": "air"
        },
        "activity_pricing": [
          {
            "base_price": 2500.00,
            "currency": "INR"
          }
        ]
      }
    ]
  }
}
```

#### PUT /api/v1/vendors/:id/approve
Approve vendor profile (Step 1 of multi-step approval).

**Request Body:**
```json
{
  "approval_notes": "All details verified"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor approved successfully",
  "data": {
    "vendor": {
      "id": "vendor-uuid",
      "status": "approved",
      "approved_at": "2024-01-16T12:00:00Z",
      "approved_by": "admin-uuid"
    }
  }
}
```

#### PUT /api/v1/vendors/:id/reject
Reject vendor profile.

**Request Body:**
```json
{
  "approval_notes": "Documents incomplete"
}
```

#### PUT /api/v1/vendors/:id/suspend
Suspend vendor (super_admin only).

**Request Body:**
```json
{
  "reason": "Policy violation"
}
```

#### PUT /api/v1/vendors/documents/:documentId/approve
Approve vendor document (Step 2 of multi-step approval).

**Request Body:**
```json
{
  "approval_notes": "Document verified"
}
```

#### PUT /api/v1/vendors/documents/:documentId/reject
Reject vendor document.

**Request Body:**
```json
{
  "approval_notes": "Document not clear"
}
```

#### PUT /api/v1/vendors/activities/:activityId/approve
Approve vendor activity (Step 3 of multi-step approval).

**Request Body:**
```json
{
  "approval_notes": "License verified"
}
```

#### PUT /api/v1/vendors/activities/:activityId/reject
Reject vendor activity.

**Request Body:**
```json
{
  "approval_notes": "License expired"
}
```

#### GET /api/v1/vendors/stats/overview
Get vendor statistics overview.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 120,
    "byStatus": {
      "pending": 15,
      "approved": 95,
      "rejected": 5,
      "suspended": 5
    },
    "recentRegistrations": 12
  }
}
```

---

### 📅 Booking Management

#### GET /api/v1/bookings
Get all bookings with filters.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10)
- `status` (optional) - pending, confirmed, cancelled_by_customer, cancelled_by_vendor, completed, refunded, no_show
- `vendor_id` (optional) - Filter by vendor
- `customer_id` (optional) - Filter by customer
- `start_date` (optional) - Filter by start date
- `end_date` (optional) - Filter by end date
- `sortBy` (optional, default: created_at)
- `sortOrder` (optional, default: desc)

#### GET /api/v1/bookings/:id
Get booking details with participants and payment info.

#### PUT /api/v1/bookings/:id/cancel
Cancel booking (vendor cancellation).

**Request Body:**
```json
{
  "reason": "Bad weather conditions",
  "force_majeure": true
}
```

#### GET /api/v1/bookings/stats/overview
Get booking statistics.

---

### 💰 Settlement Management

#### GET /api/v1/settlements
Get all settlements with filters.

**Query Parameters:**
- `page`, `limit`
- `status` - pending_settlement, ready_for_review, approved, processing, completed, failed, on_hold, cancelled
- `vendor_id` - Filter by vendor

#### GET /api/v1/settlements/:id
Get settlement details.

#### PUT /api/v1/settlements/:id/approve
Approve settlement for payment (Finance team only).

**Request Body:**
```json
{
  "review_notes": "Verified and approved"
}
```

#### PUT /api/v1/settlements/:id/complete
Mark settlement as completed (Finance team only).

**Request Body:**
```json
{
  "payout_method": "bank_transfer",
  "payout_reference": "TXN123456789",
  "notes": "Payment processed"
}
```

#### GET /api/v1/settlements/stats/overview
Get settlement statistics.

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- **Vendor Endpoints**: 100 requests per 15 minutes per IP
- **All Endpoints**: Global rate limit applies

---

## Multi-Step Approval Workflow

### Step 1: Approve Vendor Profile
```
PUT /api/v1/vendors/:id/approve
```

### Step 2: Approve Documents
For each document:
```
PUT /api/v1/vendors/documents/:documentId/approve
```

### Step 3: Approve Activities
For each activity:
```
PUT /api/v1/vendors/activities/:activityId/approve
```

---

## Best Practices

1. **Always include Authorization header** with valid JWT token
2. **Handle pagination** for large datasets
3. **Use filters** to reduce response size
4. **Log all admin actions** - automatically handled by backend
5. **Check permissions** before calling endpoints
6. **Validate response** success field before processing data

---

## Example: Complete Vendor Approval Flow

```javascript
// 1. Get vendor details
const vendor = await api.get(`/api/v1/vendors/${vendorId}`);

// 2. Approve vendor profile
await api.put(`/api/v1/vendors/${vendorId}/approve`, {
  approval_notes: 'Profile verified'
});

// 3. Approve all documents
for (const doc of vendor.documents.list) {
  if (doc.status === 'pending') {
    await api.put(`/api/v1/vendors/documents/${doc.id}/approve`, {
      approval_notes: 'Document verified'
    });
  }
}

// 4. Approve all activities
for (const activity of vendor.activities.list) {
  if (activity.status === 'pending') {
    await api.put(`/api/v1/vendors/activities/${activity.id}/approve`, {
      approval_notes: 'Activity approved'
    });
  }
}
```

---

## Support

For API issues or questions, check the logs or contact the development team.
