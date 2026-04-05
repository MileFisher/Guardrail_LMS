# Guardrail LMS Backend

This is the first backend scaffold for the standalone Guardrail LMS prototype.

## Current Scope

- Express API
- JWT-based authentication
- Register endpoint
- Login endpoint
- Protected `me` endpoint
- In-memory user store for early development

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

## Example Register Request

```json
{
  "email": "student1@example.com",
  "password": "password123",
  "displayName": "Student One",
  "role": "student"
}
```

## Important Note

The current user store is in memory only. Restarting the server clears all users.

This is intentional for step 1 so the team can test auth flow before connecting PostgreSQL.
