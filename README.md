# Vaulted

Track your collection. Cards, figures, vinyl, manga, games. Log what you own and share it with people who get it.

## Tech Stack

- **Frontend:** React, Vite, Zustand, React Router
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT (email/password)
- **Images:** Cloudinary
- **Sync:** Offline-first (IndexedDB locally, PostgreSQL in the cloud)

## Project Structure

```text
collection-app/
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── styles/
│   │   └── utils/
│   ├── vite.config.js
│   └── package.json
├── server/              # Backend (Express + PostgreSQL)
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── migrations/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── server.js
│   └── package.json
└── package.json
```

## Quick Start

### Requirements

- Node.js 18+
- PostgreSQL 12+
- npm 8+

### Setup

```bash
npm install
```

### Run

Frontend and backend together:

```bash
npm run dev
```

- **Frontend:** <http://localhost:5173>
- **Backend:** <http://localhost:5000>

### Build

```bash
npm run build
```

### Other Commands

- `npm run build:client` - Build frontend only
- `npm run build:server` - Build backend only
- `npm run preview` - Preview production build
- `npm run lint` - Lint both
- `npm run start` - Start backend server

## What It Does

Create collections and add items to them. Each item can have a name, note, and optional photo. Photos can be cropped before saving. Click any item photo to open it fullscreen.

Collections have categories, descriptions, and covers (solid color or uploaded image). You can search and filter your collections on the dashboard, and search items within a collection too.

Collections can be made public. Public collections show up on the Explore page, where anyone can browse and filter by category. Logged-in users can also search for other users and send friend requests. Public profiles are visible to anyone, even without an account.

Profile lets you set a username, bio, and avatar. The avatar is either a colored icon (28 color options) or an uploaded photo. The profile page shows stats on your collections and a breakdown of your friends network.

## Sync

Everything saves to local IndexedDB first, so the app works offline. When online, changes push to the backend automatically and poll every 30 seconds. Other devices pick up changes on their next cycle without needing a refresh.

## Development

Uses npm workspaces. Frontend and backend run concurrently with `npm run dev`.

- Frontend: Vite dev server on 5173, hot reload included
- Backend: Node.js with auto-reload on 5000

## Environment Variables

### Client

Create `.env.local` in `/client`:

```bash
VITE_API_URL=http://localhost:5000
```

### Server

Create `.env` in `/server`. Use either `DATABASE_URL` or the individual connection vars:

```bash
# Database (use one or the other)
DATABASE_URL=postgres://user:password@localhost:5432/collection_app

DB_HOST=localhost
DB_PORT=5432
DB_NAME=collection_app
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development
SECURE_COOKIES=false

# Auth
JWT_SECRET=your_secret_key

# Image storage
IMAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Database

Run migrations after setting up PostgreSQL:

```bash
npm run migrate
```

## Code Style

- BEM naming for CSS
- React hooks and functional components
- Single flat Zustand store

## License

MIT
