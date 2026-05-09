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

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env` and set:

- `NODE_ENV`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `BCRYPT_ROUNDS`
- `DATABASE_URL`
- `DB_SSL` if using hosted Postgres such as Neon
- `FRONTEND_ORIGIN`
- optional `CORS_ALLOWED_ORIGINS`
- `OPENAI_API_KEY` for OpenAI-backed Socratic tutor requests
- or `OPENROUTER_API_KEY` plus `OPENROUTER_MODEL` for OpenRouter-backed tutor requests

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

The backend is API-only. In production, the frontend should be deployed separately as a static app and configured to call this API.

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

## Seed Data

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

## Deployment Notes

- Render can use the repo-level [`render.yaml`](../render.yaml) blueprint.
- In production, set `FRONTEND_ORIGIN` and `CORS_ALLOWED_ORIGINS` to your real frontend domain so browser requests are restricted by CORS.
- For Neon, prefer `DATABASE_URL` and set `DB_SSL=true`.
