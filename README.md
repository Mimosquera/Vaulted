# Collection App

Build and manage your collections. Store cards, figures, games, music - whatever you're into. Works offline, keeps data in sync across devices.

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

### Getting Started

Run frontend and backend together:

```bash
npm run dev
```

The app will be at:

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend:** [http://localhost:5000](http://localhost:5000)

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

- Create and organize collections
- Edit collections and items
- Upload custom cover images
- Make collections public or keep them private
- Auto-syncs when you're online
- Works offline using local storage
- Share collection links

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

Start with PostgreSQL and run migrations:

```bash
npm run migrate --workspace=server
```

## How It Works

**Offline-First Sync:**

1. Save locally to IndexedDB right away
2. When online, sync with the backend
3. Backend stores in PostgreSQL
4. Other devices get the update on next sync

**Auth:**

- Register with email/password
- Get a JWT token (expires in 7 days)
- Protected routes require auth
- Can manually refresh token

## Code Style

- BEM naming for CSS
- React hooks and functional components
- Single flat Zustand store
- Keep it simple - don't over-implement

## Notes

This is a personal project for managing collections. Data stays in sync across devices when you're online. Everything works offline too.

## License

MIT
