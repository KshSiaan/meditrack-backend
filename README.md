# MediTrack Backend

MediTrack is a secure REST API for managing doctors, their assigned patients,
and administrative dashboard analytics. Better Auth protects the API with
MongoDB-backed email/password sessions, while application-specific doctor and
patient records use indexed Mongoose models with validated relationships,
search, filtering, pagination, and aggregation-backed summaries.

## Setup

1. Install Bun and MongoDB Atlas/local MongoDB.
2. Install dependencies:

   ```bash
   bun install
   ```

3. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   Copy-Item .env.example .env
   ```

4. Start development mode:

   ```bash
   bun run dev
   ```

5. Create the initial admin account:

   ```bash
   bun run seed:admin
   ```

The API listens on `http://localhost:5000` by default. Set `PORT` to change it.

## Environment

Required variables:

```text
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_SECRET=<at-least-32-character-secret>
CLIENT_DOMAIN=http://localhost:3000
DB_URL=<mongodb-connection-string>
```

MongoDB credentials containing reserved URL characters must be percent-encoded.
Never commit `.env`.

## Scripts

```bash
bun run dev        # Nodemon development server
bun run start      # Start without Nodemon
bun run typecheck  # TypeScript validation
bun run seed:admin # Idempotently create the initial admin
```

## Architecture

The request flow is:

```text
Frontend -> Express CORS -> Better Auth or REST router
         -> Auth/session guard -> validation -> Mongoose -> MongoDB
```

Better Auth owns its `user`, `session`, `account`, and `verification`
collections. MediTrack owns the `doctors` and `patients` collections through
the models in `src/models`. Patients reference doctors with `doctorId`.
Doctor list responses calculate `patientCount`; patient responses populate the
assigned doctor.

Authenticated users can read the dashboard, doctor, and patient resources.
Only users with Better Auth's `admin` role can create, update, or delete
MediTrack records. The admin plugin's default admin permissions are enabled in
`src/lib/auth.ts`, including user-management capabilities.

## Authentication routes

All Better Auth routes are mounted under `/api/auth`:

```text
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/get-session
GET  /api/auth/ok
```

Send the session cookie returned by sign-in with protected REST requests.

## REST API routes

All routes below require an authenticated Better Auth session unless marked
otherwise. Mutation routes require the `admin` role.

### Health

```text
GET /api/health
```

Returns application and MongoDB connection status.

### Doctors

```text
GET    /api/doctors
POST   /api/doctors                         Admin
PATCH  /api/doctors/:id                     Admin
DELETE /api/doctors/:id                     Admin
GET    /api/doctors/:id/patients
```

`GET /api/doctors` supports:

```text
search, specialization, hospital, assignment, from, to, page, limit
```

The `assignment` filter is based on each doctor's assigned patient count:

```text
GET /api/doctors?assignment=assigned
GET /api/doctors?assignment=unassigned
GET /api/doctors?assignment=all
```

`assigned` returns doctors with at least one patient, `unassigned` returns
doctors with zero patients, and `all` is the default.

Each doctor includes `patientCount`. A doctor with assigned patients cannot be
deleted until those patients are reassigned or removed.

Create/update doctor body:

```json
{
  "name": "Dr. Ada Lovelace",
  "specialization": "Cardiology",
  "hospital": "MediTrack General",
  "phone": "+1 555 0100",
  "email": "ada@example.com"
}
```

### Patients

```text
GET    /api/patients
POST   /api/patients/doctor/:doctorId        Admin
PATCH  /api/patients/:id                    Admin
DELETE /api/patients/:id                    Admin
```

`GET /api/patients` supports:

```text
search, condition, doctorId, from, to, page, limit

For patients, `from` and `to` filter by `assignedAt`, not record creation
date. `assignedAt` is set when a patient is created and refreshed whenever
the patient's doctor assignment is updated. Existing patient records without
`assignedAt` use `createdAt` as a backwards-compatible fallback.

Use the `assignment` query parameter to filter patients by doctor assignment:

```text
GET /api/patients?assignment=assigned
GET /api/patients?assignment=unassigned
GET /api/patients?assignment=all
```

The default is `all`. Use `doctorId` alongside `assignment=assigned` to filter
patients for one specific doctor. Sending `doctorId` without `assignment`
continues to filter by that specific doctor.
```

Patient responses include the assigned doctor:

```json
{
  "name": "Patient Name",
  "email": "patient@example.com",
  "phone": "+1 555 0101",
  "dateOfBirth": "1990-01-01",
  "condition": "Hypertension",
  "doctorId": {
    "_id": "...",
    "name": "Dr. Ada Lovelace",
    "specialization": "Cardiology"
  }
}
```

### Dashboard

```text
GET /api/dashboard
```

Returns total doctors, total patients, patients per doctor, and date-based
patient creation statistics.

## Admin account

Run `bun run seed:admin` after setup. It creates the account only when the
email does not already exist. Existing accounts are left completely unchanged.

```text
Email:    meditrack@admin.com
Password: meditrack@admincom
Role:     admin
```

Change this password immediately outside local development.
