# Katara

A connected-pharmacy platform for Lebanon: a Next.js 16 frontend and a Node API service over PostgreSQL.

Katara brings customers, pharmacies, and administrators into one application.
Customers can search medication availability, manage prescriptions, and reserve
stock; pharmacies can manage inventory and reservations; administrators can
review platform data and pharmacy verification requests.

## Prerequisites

- Node.js 20.9 or newer
- npm
- Git

No external database is required for the default local setup. The API uses an
embedded PGlite database and seeds demonstration data automatically.

## Run locally

```bash
git clone https://github.com/altuser3313-lab/katara-frontend.git
cd katara-frontend
npm run setup
npm run dev:all
```

That installs both packages and starts:

| Service | Port | What it is |
|---|---|---|
| Web | 3000 | Next.js app (customer / pharmacy / admin portals) |
| API | 4000 | Express service — owns the database |

Open `http://localhost:3000` — if that port is taken, Next.js picks the next free
one and prints it as `[web] - Local: ...`. The database creates and seeds itself
on the first API start.

The default development configuration works without an environment file. To
customize the frontend or connect AWS services, copy `.env.example` to
`.env.local` and fill in only the values you need. Local environment files,
database files, and uploaded prescription files are excluded from Git.

Seeded accounts, all with password **`katara1234`**:

| Email | Portal |
|---|---|
| `customer@katara.demo` | Customer — Maya Khoury |
| `pharmacy@katara.demo` | Pharmacy — Achrafieh Pharmacy |
| `admin@katara.demo` | Admin — Katara Administrator |

To start over: `npm run db:reset`.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev:all` | Run the web application and API together |
| `npm run dev` | Run only the Next.js frontend |
| `npm run dev:api` | Run only the API in watch mode |
| `npm run build` | Create and validate the production frontend build |
| `npm run start` | Serve the production frontend after a build |
| `npm --prefix server start` | Run the API without watch mode |
| `npm run db:reset` | Reapply the schema and reload demonstration data |

For a production-style local run, open two terminals after `npm run setup`:

```bash
# Terminal 1
npm run build
npm run start

# Terminal 2
npm --prefix server start
```

The API health endpoint is `http://localhost:4000/health`.

## Configuration

Frontend variables are documented in `.env.example`. The API also accepts the
following optional variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DATABASE_URL` | embedded PGlite | PostgreSQL connection string |
| `JWT_SECRET` | local development value | Token signing secret; set this in deployed environments |
| `DEMO_PASSWORD` | `katara1234` | Password assigned when demo data is seeded |

## Repository structure

```text
katara-frontend/
├── public/                 Static assets
├── scripts/dev.mjs         Combined frontend/API development runner
├── server/                 Express API and PostgreSQL data layer
│   └── src/
│       ├── db/             Schema, seed data, and database adapter
│       └── routes/         Customer, pharmacy, admin, auth, and search APIs
├── src/app/                Next.js App Router pages
├── src/components/         Shared interface components
├── src/lib/                API, authentication, and application helpers
└── BACKEND_CONTRACT.md     API and authorization contract
```

## Verification

The final code can be checked with:

```bash
npm run setup
npm run build
npm --prefix server start
```

Then request `GET http://localhost:4000/health` and confirm that it returns
`{"status":"ok", ...}`. Use the seeded accounts above to verify each portal.

## Architecture

```
Browser  ──HTTP+JWT──▶  Katara API (server/)  ──SQL──▶  PostgreSQL
```

The browser never touches SQL. Every read and write goes through an authorized
endpoint, exactly as `BACKEND_CONTRACT.md` specifies.

### Database

The API runs on **PGlite** by default — real PostgreSQL compiled to WASM,
persisted to `server/.data/pg`. No server to install, no credentials.

Point it at a real PostgreSQL instance (local, RDS, or Aurora) by setting one
variable — the SQL is unchanged:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/katara npm run dev:api
```

Schema and seed data live in `server/src/db/schema.sql` and `seed.sql` as plain
Postgres DDL, so they also run through `psql -f` against Aurora directly.

Tables: `users`, `pharmacies`, `pharmacy_staff`, `medications`,
`pharmacy_inventory`, `inventory_movements`, `prescriptions`, `reservations`,
`reservation_events`, `pharmacy_verifications`, `verification_documents`.

### Authorization

Three rules are enforced in the API, not the UI:

1. **Identity comes from the token.** `authenticate` verifies the JWT and loads
   the user; nothing reads a role or user id from the request body.
2. **A pharmacy user's `pharmacy_id` comes from `pharmacy_staff`,** never from
   the request. A pharmacy cannot read or write another pharmacy's inventory
   even by guessing ids.
3. **Customers see only their own** profile, prescriptions and reservations.
   Cross-pharmacy master views are admin-only endpoints.

Tokens are signed locally but carry the same `cognito:groups` claim a Cognito
access token does, so swapping in a real user pool does not change the frontend.

### Prescription uploads

Three steps, matching the S3 flow in the contract: request an upload URL, `PUT`
the bytes to it, then record the metadata. Locally the URL points back at the API
and bytes land in `server/.data/uploads/<userId>/`; on AWS it becomes a presigned
S3 URL and the client code does not change.

### Substitutes and forecasting

Neither is a language model today, and both are honest about it:

- **Substitutes** rank real catalog entries — same active ingredient first, then
  same therapeutic class — ordered by live stock across pharmacies.
- **Forecasts** derive daily demand from the pharmacy's own reservation and
  dispensing history. Lines with no history fall back to a category baseline and
  are labelled `baseline` in the UI. "Confidence" is the share of lines with real
  history, not a model score.

Both are single handlers in `server/src/routes/`, ready to be swapped for Bedrock.

## Deploying later

- **Frontend:** AWS Amplify Hosting.
- **API:** the Express app lifts to Lambda behind API Gateway; routes already map
  1:1 to the contract's endpoint list.
- **Database:** point `DATABASE_URL` at Aurora PostgreSQL and run the schema file.
- **Auth:** create the Cognito pool with groups `customer`, `pharmacy`, `admin`,
  then set `NEXT_PUBLIC_AUTH_MODE=cognito` plus the pool ids in `.env.local`.
- **Files:** replace the local blob route with S3 presigned URLs.
- **Map:** `src/lib/location-adapter.js` already emits GeoJSON for MapLibre /
  Amazon Location; pharmacies carry latitude and longitude.

## Data provenance

Pharmacy names, addresses, phone numbers and opening hours come from the
recovered SQL snippet. Latitude/longitude are approximate town-centre
coordinates and should be replaced with surveyed addresses before being used for
real navigation. Prices are LBP.
