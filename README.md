# Guardrail LMS

## Structure

- `backend/` Express API, PostgreSQL schema/bootstrap, seed script
- `frontend/` static browser UI served by the backend at `/`

## Development Setup

### 1) Install dependencies

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2) Start database (Docker)

```bash
npm run db:up
```

### 3) Seed data (first run or after reset)

```bash
npm run db:seed
```

### 4) Run backend + frontend together

```bash
npm run dev
```

## Useful Scripts (repo root)

- `npm run dev` - run backend and frontend together
- `npm run dev:backend` - run backend only
- `npm run dev:frontend` - run frontend only
- `npm run db:up` - start PostgreSQL container from `backend/docker-compose.yml`
- `npm run db:down` - stop PostgreSQL container
- `npm run db:seed` - seed backend data
- `npm run dev:with-db` - start DB then run both apps
- `npm run setup:dev` - start DB, seed data, then run both apps

## Recommended Workflow

- First run: `npm run setup:dev`
- Daily run: `npm run dev:with-db`
- If DB is already running: `npm run dev`

## Production Deployment

This repo is prepared for a split deployment:

- Frontend: Cloudflare Pages
- Backend: Render Web Service
- Database: Neon Postgres

Important production notes:

- The backend is now API-only in production and no longer serves the frontend app.
- Set `VITE_API_BASE_URL=https://api.yourdomain.com` in the frontend host.
- Set `FRONTEND_ORIGIN` and `CORS_ALLOWED_ORIGINS` on the backend so CORS only allows your real frontend domain.
- The frontend SPA fallback file is included for Cloudflare Pages routing.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment checklist, env vars, and DNS setup.
