# Guardrail LMS

A process-based academic integrity system with two core subsystems:

- **Integrity Monitor** — keystroke dynamics, HMAC-signed telemetry, and Z-score anomaly detection.
- **Socratic Tutor** — AI-guided hints during non-assessed study sessions via OpenRouter.

---

## Architecture

This project is deployed as two separate services with a managed database:

| Layer | Service |
|---|---|
| Frontend | Cloudflare Pages |
| Backend API | Render Web Service |
| Database | Neon Postgres (serverless) |

In production, the backend is **API-only** — it does not serve the frontend. The frontend is a static React SPA deployed independently and calls the backend over HTTPS.

---

## Repository Structure

```
guardrail-lms/
├── backend/          Express API (Node.js)
│   ├── src/
│   │   ├── config/   env.js — single source for all env vars
│   │   ├── db/       schema.sql, database connection
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── data/     *.store.js — all DB queries live here
│   └── package.json
├── frontend/         React 19 + Vite SPA
│   ├── src/
│   └── package.json
├── render.yaml       Render deployment config (auto-deploy)
└── package.json      Root scripts for local dev only
```

---

## Production Deployment

### 1. Database — Neon Postgres

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **connection string** (it looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).
3. Run the schema against your Neon database:

```bash
psql "YOUR_NEON_CONNECTION_STRING" -f backend/src/db/schema.sql
```

4. (Optional) Seed initial data:

```bash
DATABASE_URL="YOUR_NEON_CONNECTION_STRING" node backend/src/scripts/seed.js
```

---

### 2. Backend — Render Web Service

The `render.yaml` in the repo root configures this automatically when you connect the repo to Render.

**Steps:**

1. Go to [render.com](https://render.com) → **New Web Service** → connect your GitHub repo.
2. Render will detect `render.yaml` and pre-fill the settings.
3. Set the following **environment variables** in the Render dashboard (marked `sync: false` in `render.yaml` — you must set them manually):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `DB_SSL` | `true` |
| `JWT_SECRET` | A long random secret (generate with `openssl rand -hex 64`) |
| `FRONTEND_ORIGIN` | Your Cloudflare Pages URL e.g. `https://guardrail-lms.pages.dev` |
| `CORS_ALLOWED_ORIGINS` | Same as above (or comma-separated if you have a custom domain) |
| `OPENROUTER_API_KEY` | Your key from [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_MODEL` | e.g. `anthropic/claude-3-haiku` or `openai/gpt-4o-mini` |
| `OPENROUTER_SITE_URL` | Your Cloudflare Pages URL |
| `OPENROUTER_APP_NAME` | `Guardrail LMS` |

> **Note:** `NODE_ENV=production` and `OPENROUTER_APP_NAME` are already set in `render.yaml` and do not need to be re-entered.

4. Deploy. Render will run `npm install` then `npm start` from the `backend/` directory.
5. Confirm the health check passes at `https://your-render-url.onrender.com/health`.

---

### 3. Frontend — Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → **Create a project** → connect your GitHub repo.
2. Set the **build configuration**:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |

3. Add the following **environment variable** in the Cloudflare Pages dashboard:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Your Render backend URL e.g. `https://guardrail-lms-api.onrender.com` |

4. Deploy. Cloudflare will build the Vite app and serve it globally via CDN.

> **SPA routing:** Cloudflare Pages serves `index.html` for all routes by default. No `_redirects` file is needed for this setup.

---

### 4. Custom Domain (Optional)

- **Frontend:** Add your domain in Cloudflare Pages → **Custom domains**. DNS is managed automatically if your domain is already on Cloudflare.
- **Backend:** Add your domain in Render → **Custom domains**, then create a CNAME record pointing to your Render URL.
- Once done, update `FRONTEND_ORIGIN` and `CORS_ALLOWED_ORIGINS` on Render and `VITE_API_BASE_URL` on Cloudflare Pages to use your real domains.

---

## Local Development Setup

Local dev uses Docker for PostgreSQL only. The backend and frontend run directly on your machine.

### 1. Install dependencies

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` — the defaults work for local dev except for the AI key:

```env
NODE_ENV=development
PORT=4000
JWT_SECRET=replace-with-any-local-secret
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/guardrail_lms

# Use OpenRouter (recommended) or OpenAI
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_NAME=Guardrail LMS Local

FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Start database

```bash
npm run db:up
```

### 4. Apply schema and seed data (first run only)

```bash
npm run db:seed
```

### 5. Run backend + frontend

```bash
npm run dev
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

---

## Local Dev Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Run backend + frontend together |
| `npm run dev:backend` | Run backend only |
| `npm run dev:frontend` | Run frontend only |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:seed` | Seed database with test data |
| `npm run dev:with-db` | Start DB then run both apps |
| `npm run setup:dev` | Start DB + seed + run both apps (first run shortcut) |

**Recommended workflow:**

```bash
# First time
npm run setup:dev

# Every day after
npm run dev:with-db

# If Docker DB is already running
npm run dev
```

---

## Environment Variables Reference

### Backend (Render / `.env`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` on Render, `development` locally |
| `PORT` | No | Defaults to `4000` |
| `DATABASE_URL` | Yes | Full Postgres connection string (with `?sslmode=require` for Neon) |
| `DB_SSL` | Yes (prod) | Set to `true` for Neon/any managed Postgres |
| `JWT_SECRET` | Yes | Long random string — keep secret |
| `JWT_EXPIRES_IN` | No | Defaults to `1d` |
| `BCRYPT_ROUNDS` | No | Defaults to `12` — do not go below 12 |
| `FRONTEND_ORIGIN` | Yes | Exact origin of your deployed frontend |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated extra origins if needed |
| `OPENROUTER_API_KEY` | Yes | From openrouter.ai |
| `OPENROUTER_MODEL` | Yes | e.g. `anthropic/claude-3-haiku` |
| `OPENROUTER_BASE_URL` | No | Defaults to `https://openrouter.ai/api/v1` |
| `OPENROUTER_SITE_URL` | No | Sent as `HTTP-Referer` to OpenRouter |
| `OPENROUTER_APP_NAME` | No | Sent as `X-Title` to OpenRouter |

### Frontend (Cloudflare Pages)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Full URL of your Render backend e.g. `https://guardrail-lms-api.onrender.com` |

---

## Security Notes

- **Never commit `.env`** — it is in `.gitignore`. Secrets go in Render and Cloudflare dashboards only.
- **CORS is strict in production** — if `FRONTEND_ORIGIN` is not set, the backend will reject all cross-origin requests in production mode.
- **`DB_SSL=true` is required for Neon** — all connections are TLS-enforced.
- **The OpenRouter API key must never reach the frontend** — all AI calls are server-side only.
- **`JWT_SECRET` must be a strong random value** — generate one with `openssl rand -hex 64`.