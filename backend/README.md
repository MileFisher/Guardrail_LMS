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
- In-memory stores for early development

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

- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `BCRYPT_ROUNDS`

## Routes

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

## Important Note

The current stores are in memory only. Restarting the server clears users, consent data, and telemetry sessions.

This is intentional for early development so the team can validate auth, consent, and telemetry flow before connecting PostgreSQL.
