# MediTrack Backend

## Conclusion

MediTrack is a standalone modular Express REST API for an administrative doctor
and patient tracker. It provides Better Auth email/password authentication,
MongoDB-backed sessions, role-based admin authorization, Mongoose models for
doctors and patients, doctor assignment tracking, paginated search/filter
routes, and aggregation-backed dashboard analytics. The backend is designed
for a separate Next.js frontend and is ready to run with Bun and Nodemon.

Doctors and patients are application records, not login accounts. Better Auth
users are the authenticable users. A Better Auth user with the `admin` role can
manage doctors and patients; authenticated non-admin users can read protected
resources.

## Stack and primary libraries

| Library | Purpose |
| --- | --- |
| Bun | Runtime, package manager, and TypeScript execution |
| Express 5 | HTTP server and REST routing |
| Better Auth | Email/password auth, sessions, users, roles |
| `@better-auth/mongo-adapter` | Better Auth persistence in MongoDB |
| MongoDB driver | Better Auth database client |
| Mongoose | Application models, validation, indexes, queries |
| CORS | Cross-origin frontend requests with credentials |
| Nodemon | Development reloads |
| TypeScript | Strict static typing |

## Setup

Requirements:

- Bun
- MongoDB Atlas or a local MongoDB instance

Install:

```bash
bun install
```

Create the local environment file from the safe template:

```powershell
Copy-Item .env.example .env
```

Open `.env` and set:

- `BETTER_AUTH_URL` to the backend origin.
- `BETTER_AUTH_SECRET` to a random value with at least 32 characters.
- `CLIENT_DOMAIN` to the frontend origin.
- `DB_URL` to the MongoDB Atlas or local MongoDB connection string.
- `PORT` if the default `5000` is not suitable.

For a local-only setup, the expected origins are:

```dotenv
BETTER_AUTH_URL=http://localhost:5000
CLIENT_DOMAIN=http://localhost:3000
PORT=5000
```

Make sure MongoDB is running or the Atlas cluster is reachable before starting
the API. The server connects to MongoDB before it begins listening. Start it
with:

```bash
bun run dev
```

The API listens on `http://localhost:5000` by default. Set `PORT` if another
port is required. Confirm the connection at:

```text
GET http://localhost:5000/api/health
```

The response should report:

```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "state": "connected"
  }
}
```

### Seed the admin account

Run the seeder in a second terminal after `.env` is configured and MongoDB is
reachable:

```bash
bun run seed:admin
```

The seeder:

1. Connects to the MongoDB database.
2. Checks whether the configured admin email already exists.
3. Creates the Better Auth user with the `admin` role if it does not exist.
4. Leaves an existing account completely unchanged.
5. Closes the database connection when finished.

The command is safe to run repeatedly. It will not replace an existing account,
change its password, update its name, or change its role.

The local test admin credentials are defined in
`src/scripts/seed-admin.ts`. Use those credentials only for local testing and
change them before any shared, staging, or production deployment. After
seeding, sign in through:

```text
POST http://localhost:5000/api/auth/sign-in/email
```

Then verify the authenticated session:

```text
GET http://localhost:5000/api/auth/get-session
```

## Environment variables

The complete environment shape used by this backend is:

```dotenv
# Testing/local only. Do not commit real values.
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_SECRET=<local-secret-at-least-32-characters>
CLIENT_DOMAIN=http://localhost:3000
DB_URL=<mongodb-connection-string>
PORT=5000
```

These are intentionally placeholders. Real MongoDB credentials, Better Auth
secrets, and passwords must remain in the ignored `.env` file or a secret
manager and must never be copied into README files, commits, screenshots, or
frontend code. MongoDB credentials containing reserved URL characters must be
percent-encoded.

## Commands

```bash
bun run dev        # Start Nodemon and the Bun TypeScript server
bun run start      # Start the API without Nodemon
bun run typecheck  # Run the TypeScript checker
bun run seed:admin # Create the initial admin if it does not exist
```

The admin seeder is idempotent. If the configured admin email already exists,
it leaves that account completely unchanged. Change any local test password
before using the project outside local development.

## Architecture

```text
Frontend
  -> CORS middleware with credentials
  -> Better Auth handler (/api/auth/*)
     or REST router (/api/*)
  -> session/admin authorization middleware
  -> request validation
  -> Mongoose models and aggregation pipelines
  -> MongoDB
```

Better Auth owns these collections:

```text
user
account
session
verification
```

MediTrack owns these application collections:

```text
doctors
patients
```

Patients reference doctors with `doctorId`. A patient has `assignedAt` when
assigned to a doctor. Reassignment refreshes `assignedAt`; unassignment clears
both `doctorId` and `assignedAt`. Legacy patients without `assignedAt` use
`createdAt` as a date-filter fallback.

## Authorization

All REST reads except health require a Better Auth session:

```text
Authenticated user -> read dashboard, doctors, patients
Admin role         -> create, update, delete doctors and patients
Unauthenticated    -> 401
Authenticated non-admin mutation -> 403
```

The frontend may hide mutation controls when `session.user.role !== "admin"`,
but the backend remains authoritative and must still be allowed to return
`403`.

## Complete API reference

Base URL:

```text
http://localhost:5000
```

Frontend requests must include credentials so the Better Auth cookie is sent:

```ts
fetch(`${API_URL}/api/doctors`, { credentials: "include" });
```

or:

```ts
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});
```

### Root

```http
GET /
```

Public server information:

```json
{ "message": "MediTrack API is running" }
```

### Better Auth

All Better Auth endpoints are handled under `/api/auth/*`.

```http
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/get-session
GET  /api/auth/ok
```

Sign up/sign in email body:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "local-test-password"
}
```

The browser must retain the session cookie returned by sign-in. The frontend
should call `GET /api/auth/get-session` on startup to determine the current
user and role.

### Health

```http
GET /api/health
```

Public MongoDB/application health:

```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "state": "connected"
  },
  "timestamp": "2026-10-02T12:00:00.000Z"
}
```

### Doctors

#### List doctors

```http
GET /api/doctors
```

Authenticated users can read this route.

Query parameters:

```text
page             default 1
limit            default 20, maximum 100
search           name, specialization, or hospital
specialization  case-insensitive partial match
hospital        case-insensitive partial match
assignment      assigned, unassigned, or all; default all
from             inclusive doctor createdAt date
to               inclusive doctor createdAt date
```

Examples:

```http
GET /api/doctors?assignment=assigned&page=1&limit=20
GET /api/doctors?assignment=unassigned&page=1&limit=20
GET /api/doctors?assignment=all&page=1&limit=20
GET /api/doctors?search=cardio&specialization=Cardiology&page=1&limit=10
GET /api/doctors?from=2026-10-01&to=2026-10-31
```

`assigned` means at least one patient references the doctor. `unassigned`
means zero patients reference the doctor. Every returned doctor includes
`patientCount`.

#### Create doctor — admin only

```http
POST /api/doctors
```

Body:

```json
{
  "name": "Dr. Ada Lovelace",
  "specialization": "Cardiology",
  "hospital": "MediTrack General",
  "phone": "+1 555 0100",
  "email": "ada@example.com"
}
```

#### Update doctor — admin only

```http
PATCH /api/doctors/:id
```

All doctor fields are optional. The same fields as create are accepted.

#### Delete doctor — admin only

```http
DELETE /api/doctors/:id
```

Returns `204` with an empty body. A doctor with assigned patients returns
`409` and must have patients reassigned or removed first.

#### Doctor patients

```http
GET /api/doctors/:id/patients?page=1&limit=20
```

Returns the doctor, paginated patients, and populated `doctorId` data.

### Patients

#### List patients

```http
GET /api/patients
```

Authenticated users can read this route.

Query parameters:

```text
page         default 1
limit        default 20, maximum 100
search       name, email, or condition
condition    case-insensitive partial match
doctorId     one specific assigned doctor ObjectId
assignment   assigned, unassigned, or all; default all
from         inclusive assignedAt date
to           inclusive assignedAt date
```

Examples:

```http
GET /api/patients?assignment=assigned&page=1&limit=20
GET /api/patients?assignment=unassigned&page=1&limit=20
GET /api/patients?assignment=all&page=1&limit=20
GET /api/patients?assignment=assigned&doctorId=DOCTOR_ID
GET /api/patients?condition=hypertension&from=2026-10-01&to=2026-10-31
```

#### Create patient — admin only

```http
POST /api/patients/doctor/:doctorId
```

Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1 555 0101",
  "dateOfBirth": "1990-01-01",
  "condition": "Hypertension"
}
```

The URL doctor must exist. Creation sets `assignedAt` automatically.

#### Update patient — admin only

```http
PATCH /api/patients/:id
```

Optional fields:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1 555 0101",
  "dateOfBirth": "1990-01-01",
  "condition": "Controlled hypertension",
  "doctorId": "DOCTOR_ID"
}
```

Changing `doctorId` refreshes `assignedAt`. Sending `"doctorId": null`
unassigns the patient and clears `assignedAt`.

#### Delete patient — admin only

```http
DELETE /api/patients/:id
```

Returns `204` with an empty body.

### Dashboard

```http
GET /api/dashboard
```

Authenticated users can read:

```json
{
  "data": {
    "totalDoctors": 8,
    "totalPatients": 42,
    "patientsPerDoctor": [
      {
        "doctorId": "DOCTOR_ID",
        "doctorName": "Dr. Ada Lovelace",
        "patientCount": 12
      }
    ],
    "patientsByDate": [
      { "_id": "2026-10-02", "count": 3 }
    ]
  }
}
```

Dashboard limits are intentional:

- `patientsPerDoctor`: top 10 doctors by assigned patient count
- `patientsByDate`: latest 25 dates, returned oldest-to-newest within that
  window for direct chart rendering

## Response and error conventions

Paginated lists return:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

Errors use:

```json
{ "error": "Human-readable message." }
```

Important status codes:

```text
200 success
201 resource created
204 resource deleted, empty body
400 invalid input
401 missing/invalid session
403 authenticated but not admin
404 resource not found
409 doctor still has assigned patients
500 unexpected server error
```

## Query optimization

### Doctor list

`GET /api/doctors` uses one aggregation pipeline that:

1. Applies text-related filters before the join.
2. Looks up matching patients from the `patients` collection.
3. Calculates `patientCount` with `$size`.
4. Filters assigned/unassigned doctors using `patientCount`.
5. Sorts, skips, and limits inside MongoDB.

The total is calculated with a matching aggregation count pipeline, so the
API returns accurate pagination metadata without loading all doctors into
application memory.

### Patient list

`GET /api/patients`:

1. Builds MongoDB filters for search, condition, doctor, assignment state, and
   assignment date.
2. Uses `assignedAt` for date filtering.
3. Falls back to `createdAt` for legacy patients without `assignedAt`.
4. Populates only the doctor fields needed by the frontend.
5. Applies sort, skip, and limit in MongoDB.
6. Runs the page query and count query in parallel with `Promise.all`.

### Dashboard

`GET /api/dashboard` runs the independent totals and aggregations in parallel:

- `countDocuments()` for doctor total
- `countDocuments()` for patient total
- `$group` and `$lookup` for patient totals per doctor
- `$group` and `$dateToString` for the date chart

The dashboard applies `$limit: 10` and `$limit: 25` in MongoDB before returning
chart/table datasets, preventing oversized payloads.

### Indexing

Doctor indexes:

```text
text: name, specialization, hospital
createdAt descending
```

Patient indexes:

```text
doctorId
assignedAt
text: name, email, condition
createdAt descending
condition + createdAt descending
```

These indexes support the frequent relationship, date, filter, and sort
operations without requiring full collection scans for the primary query
patterns.

## Validation and testing

Run the TypeScript validation:

```bash
bun run typecheck
```

Run the API:

```bash
bun run dev
```

Manual smoke checks:

```text
GET /api/health                         -> 200 with database status
GET /api/doctors without a session      -> 401
GET /api/patients without a session     -> 401
GET /api/dashboard with a session       -> 200
POST /api/doctors as non-admin          -> 403
DELETE doctor with patients             -> 409
```

The project has been verified for TypeScript compilation, MongoDB startup,
health reporting, protected-route enforcement, Better Auth health, signup,
signin, and idempotent admin seeding.

## Project structure

```text
src/
├── app.ts
├── server.ts
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   └── validation.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── models/
│   ├── doctor.model.ts
│   └── patient.model.ts
├── routes/
│   ├── dashboard.routes.ts
│   ├── doctor.routes.ts
│   ├── health.routes.ts
│   ├── index.ts
│   └── patient.routes.ts
└── scripts/
    └── seed-admin.ts
```

For the frontend-facing request contract, see
[API_INTEGRATION.txt](./API_INTEGRATION.txt).
