# Guardrail LMS Backend

This is the first backend scaffold for the standalone Guardrail LMS prototype.

## Current Scope

- Express API
- JWT-based authentication
- Register endpoint
- Login endpoint
- Protected `me` endpoint
- Role-protected demo routes for `teacher` and `admin`
- Versioned consent policy endpoints with append-only consent logs
- HMAC-SHA256 telemetry verification for monitored payloads
- PostgreSQL-backed persistence with automatic schema bootstrap

## Production deployment

The API is deployed as **its own web service**. The browser UI lives on a separate static host (for example Cloudflare Pages) and talks to this API over HTTPS.

- **Full checklist**, DNS, and copy-paste env examples: [**`DEPLOYMENT.md`**](../DEPLOYMENT.md) at the repo root.
- **Render blueprint**: [**`render.yaml`**](../render.yaml) — Web Service with `rootDir: backend`, `buildCommand: npm install`, `startCommand: npm start`, health check on `/health`.

Set secrets and URLs in your host’s dashboard (never commit real values to git). Typical production vars:

| Variable | Notes |
| -------- | ----- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Hosted Postgres connection string (e.g. Neon) |
| `DB_SSL` | `true` for Neon and most cloud providers |
| `JWT_SECRET` | Long random secret |
| `FRONTEND_ORIGIN` | Your live frontend URL (e.g. `https://yourdomain.com`) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins if you use `www` and apex |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL` | If using OpenRouter for the tutor |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional OpenAI path |

The frontend build should set `VITE_API_BASE_URL` to your API’s public URL (see `frontend/.env.example` and `DEPLOYMENT.md`).

## Local development

### Install

```bash
npm install
```

### Run

Development (watch mode):

```bash
npm run dev
```

Production-style process (same command Render uses):

```bash
npm start
```

Optional: set `PORT` in `.env` (default commonly `4000`).

### Environment (local)

Copy `.env.example` to `.env` and adjust:

- `NODE_ENV` — usually `development` locally
- `PORT`
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`
- `DATABASE_URL` — local Docker Postgres or Neon
- `DB_SSL` — `false` for typical local Docker; `true` for Neon
- `FRONTEND_ORIGIN` — e.g. `http://localhost:5173`
- Optional `CORS_ALLOWED_ORIGINS` if you need extra dev origins
- Tutor: `OPENAI_*` or `OPENROUTER_*` (see `.env.example`)

## Routes

- `GET /` API status payload
- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/demo/admin`
- `GET /api/demo/teacher`
- `GET /api/consent/policy`
- `GET /api/consent/policies`
- `POST /api/consent/policies`
- `POST /api/consent/accept`
- `GET /api/consent/logs/me`
- `GET /api/consent/logs`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/:courseId`
- `POST /api/courses/:courseId/enrollments`
- `GET /api/courses/:courseId/enrollments`
- `POST /api/courses/:courseId/assignments`
- `GET /api/courses/:courseId/assignments`
- `POST /api/telemetry/sessions`
- `POST /api/telemetry/payloads`

## Example Register Request

```json
{
  "email": "student1@example.com",
  "password": "password123",
  "displayName": "Student One",
  "role": "student"
}
```

## Example HMAC Flow

1. Register and log in as a student.
2. Create a telemetry session with `POST /api/telemetry/sessions`.
3. Save the returned `session.id` and `hmacKey`.
4. Send a telemetry JSON payload containing `sessionId`.
5. Sign the exact raw JSON body using HMAC-SHA256 and send the digest in `x-telemetry-signature`.
6. If the signature is missing or invalid, the API returns `401`.

## Database

On startup, the backend creates the core Guardrail LMS tables from `src/db/schema.sql` if they do not already exist.

The implemented schema follows `DB_plan.md` and includes:

- `users`
- `consents`
- `courses`
- `enrollments`
- `assignments`
- `writing_sessions`
- `keystroke_events`
- `session_metrics`
- `student_baselines`
- `submissions`
- `anomaly_flags`
- `study_sessions`
- `hint_interactions`

An extra `consent_policies` table is also created because the current API already supports publishing and retrieving policy versions.

## Seed Data (local)

To create local demo data:

1. Make sure PostgreSQL is running and that `DATABASE_URL` in `.env` points to it.

2. Seed demo data:

```bash
npm run db:seed
```

This seeds:

- 1 admin
- 1 teacher
- 2 students
- 1 course
- 1 assignment
- student enrollments and consent records

3. Start the API:

```bash
npm run dev
```

Only run seeds against production databases if you intentionally want demo accounts there.
