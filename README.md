# Collecto

Track and manage your collections. Cards, figures, games, music, manga — whatever you collect. Works offline, syncs when you're online.

## Tech Stack

- **Frontend:** React, Vite, Zustand, React Router
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT (email/password)
- **Sync:** Offline-first with cloud API

## Project Structure

```text
collection-app/
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── api/
│   │   └── styles/
│   ├── vite.config.js
│   └── package.json
├── server/              # Backend (Express + PostgreSQL)
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── migrations/
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
- `npm run lint` - Lint both
- `npm run start` - Start backend server

## Features

- Create and organize collections by category
- Add items with photos, names, and notes
- Upload custom cover images for collections
- Public/private toggle with shareable links
- Offline-first — works without internet, syncs when back online
- Friend network with public profile pages

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

Create `.env` in `/server`:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/collection_app
JWT_SECRET=your_secret_key
PORT=5000
```

## Database

Run migrations after setting up PostgreSQL:

```bash
npm run migrate --workspace=server
```

## How Sync Works

1. Every write goes to local IndexedDB immediately
2. On next online event, changes push to the backend
3. Backend stores to PostgreSQL
4. Other devices pull on their next sync

Auth uses JWT tokens stored in localStorage, expiring after 7 days.

## Code Style

- BEM naming for CSS
- React hooks and functional components
- Single flat Zustand store
- Don't over-engineer

## License

MIT
