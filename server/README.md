# Collection App Backend

Node.js + Express + PostgreSQL API server for Collection App.

## Prerequisites

- Node.js 18+
- PostgreSQL 12+

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Edit `.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=collection_app
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Create Database (if not exists)

```bash
createdb collection_app
# or via psql:
# psql -U postgres -c "CREATE DATABASE collection_app;"
```

### 4. Run Migrations

```bash
npm run migrate
```

This creates all tables (users, collections, items, images, sync_metadata).

### 5. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

---

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
  - Body: `{ email, password, username? }`
  - Returns: `{ user, token }`

- `POST /auth/login` - Login user
  - Body: `{ email, password }`
  - Returns: `{ user, token }`

- `POST /auth/refresh` - Refresh JWT token
  - Headers: `Authorization: Bearer {token}`
  - Returns: `{ token }`

### Collections (Protected)

- `GET /api/collections` - Get user's collections
- `GET /api/collections/public` - Get public collections
- `POST /api/collections` - Create collection
- `PUT /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection
- `POST /api/collections/:id/toggle-public` - Toggle public/private

### Items (Protected)

- `GET /api/collections/:collectionId/items` - Get items
- `POST /api/collections/:collectionId/items` - Add item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Sync (Protected)

- `POST /api/sync` - Batch sync collections & items
  - Body: `{ collections: [], items: [], deletedCollectionIds: [], deletedItemIds: [], deviceId? }`
  - Returns: `{ collections, items }`

### Images

- `POST /api/images` - Upload image (Protected)
  - Body: `{ id, data (base64), mimeType }`
  - Returns: `{ imageId, url }`

- `GET /api/images/:id` - Retrieve image (Public)
  - Returns: Binary image data

- `DELETE /api/images/:id` - Delete image (Protected)

---

## Authentication

Uses JWT tokens in Authorization header:

```
Authorization: Bearer {token}
```

Tokens expire in 7 days (configurable via `JWT_EXPIRES_IN`).

---

## Database Schema

### users
- `id` - Primary key
- `email` - Unique email
- `password_hash` - Bcrypted password
- `username` - Display name
- `created_at`, `updated_at` - Timestamps

### collections
- `id` - Nanoid from frontend
- `user_id` - Foreign key to users
- `name`, `category`, `description`
- `cover_color` - Hex color
- `cover_image_url` - Image ID or URL
- `is_public` - Boolean
- `created_at` - Frontend timestamp (BIGINT)
- `updated_at` - Server timestamp

### items
- `id` - Nanoid from frontend
- `collection_id` - Foreign key to collections
- `name`, `note`
- `image_url` - Image ID or URL
- `created_at` - Frontend timestamp (BIGINT)
- `updated_at` - Server timestamp

### images
- `id` - Unique image ID
- `user_id` - Foreign key to users
- `data` - Binary image data (BYTEA)
- `mime_type` - Image MIME type
- `size` - File size in bytes
- `created_at` - Timestamp

### sync_metadata
- `id` - Primary key
- `user_id` - Foreign key to users
- `last_sync` - Last sync timestamp
- `device_id` - Device identifier

---

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=collection_app
DB_USER=postgres
DB_PASSWORD=postgres

# Server
PORT=5000
NODE_ENV=development
BODY_LIMIT=2mb
REQUEST_TIMEOUT_MS=20000
TRUST_PROXY=false
LOG_LEVEL=debug
LOG_REQUEST_BODY=false
METRICS_ENABLED=true
METRICS_ALERT_WINDOW=200
METRICS_ERROR_RATE_ALERT_PCT=5
METRICS_LATENCY_ALERT_MS=800
METRICS_ALERT_COOLDOWN_MS=60000

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

---

## Testing Endpoints

Use Postman, curl, or the frontend API client to test:

```bash
# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get collections (requires token)
curl -X GET http://localhost:5000/api/collections \
  -H "Authorization: Bearer YOUR_TOKEN"

# Metrics snapshot
curl -X GET http://localhost:5000/metrics
```

---

## Future Enhancements

- [x] Rate limiting
- [ ] Request validation with Joi
- [x] Structured JSON request logging
- [ ] API versioning
- [ ] Automated backups
- [ ] WebSocket for real-time sync
- [ ] S3 integration for images
- [ ] Refresh token rotation
