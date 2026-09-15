# Academic E-Library & Research Portal — Backend

Node.js + Express + TypeScript API, backed by PostgreSQL via Prisma. Built to
pair with the existing "Lum/na" React/Vite frontend.

## Stack

- **Express + TypeScript** — REST API
- **PostgreSQL + Prisma** — database + ORM
- **JWT (jsonwebtoken) + bcryptjs** — authentication
- **Zod** — request validation

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your local Postgres connection string
```

You need a running PostgreSQL instance. Easiest local option is Docker:

```bash
docker run --name elib-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=elibrary -p 5432:5432 -d postgres:16
```

Then point `DATABASE_URL` in `.env` at it (the default in `.env.example`
already matches this command).

## 2. Create the database schema

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This creates all tables described in `prisma/schema.prisma` and generates the
typed Prisma client used throughout `src/`.

## 3. Seed test accounts + sample data

```bash
npm run prisma:seed
```

Creates:
- Librarian: `librarian@library.edu` / `password123`
- Student: `student@library.edu` / `password123`
- One sample approved work and four categories

## 4. Run the API

```bash
npm run dev
```

Server starts on `http://localhost:4000`. Health check: `GET /health`.

## Entity-relationship summary

```
User (STUDENT | LIBRARIAN)
 ├── SavedWork ──< Note
 │       │
 │       ├──< SavedWorkTag >── Tag (per-user)
 │       └──< CollectionItem >── Collection (per-user)
 │
 ├── Collection
 ├── Tag
 └── ActivityLog ──> Work

Work (source: OPENALEX | MANUAL, status: PENDING | APPROVED | REJECTED)
 └── Category
```

- **Work** is the local cache of literature — imported from OpenAlex or
  manually entered by a librarian. `status` is what implements "approve
  imported sources": OpenAlex imports land as `PENDING` until a librarian
  approves them; students only ever see `APPROVED` works.
- **SavedWork** is a student's bookmark and the anchor for personal `Note`s,
  `Tag`s, and `Collection` membership — this is what your Compare/Cite
  features and Collections page will read from once the frontend is wired up.
- **ActivityLog** feeds the "Recent Activity" panel on the profile page and
  doubles as an audit trail you can screenshot as development evidence for
  your weekly progress reports.

## API routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Student self-registration |
| POST | `/api/auth/login` | — | Returns a JWT |
| GET | `/api/auth/me` | any | Current user profile |
| POST | `/api/auth/librarians` | librarian | Create another librarian account |
| GET | `/api/works` | optional | Search/filter (`q`, `year`, `method`, `category`, `page`) |
| GET | `/api/works/:id` | optional | Work detail |
| POST | `/api/works` | librarian | Manually add a work |
| PUT | `/api/works/:id` | librarian | Edit metadata |
| DELETE | `/api/works/:id` | librarian | Remove a work |
| POST | `/api/works/:id/approve` | librarian | Approve a pending import |
| POST | `/api/works/:id/reject` | librarian | Reject a pending import |
| GET | `/api/saved-works` | student | The logged-in user's saved library |
| POST | `/api/saved-works` | student | Bookmark a work (`{ workId }`) |
| DELETE | `/api/saved-works/:workId` | student | Unbookmark |
| POST | `/api/saved-works/:id/notes` | student | Add a note (`{ content }`) |
| POST | `/api/saved-works/:id/tags` | student | Add a tag (`{ name }`) |
| GET | `/api/collections` | student | List the user's collections |
| POST | `/api/collections` | student | Create a collection (`{ name, colorHex? }`) |
| POST | `/api/collections/:id/items` | student | Add a saved work to a collection |
| DELETE | `/api/collections/:id/items/:savedWorkId` | student | Remove from a collection |
| GET | `/api/admin/stats` | librarian | Dashboard counts |
| GET | `/api/admin/users` | librarian | List all users |

Every authenticated route expects `Authorization: Bearer <token>` from the
login/register response.

## Deploying to Render (for testing while you build)

1. Push this repo to GitHub. If your frontend lives in the same repo, keep
   this `backend/` folder as its own directory — Render lets you point a
   service at a subdirectory.
2. **New → PostgreSQL** on Render, free plan. Once it's provisioned, copy the
   **Internal Database URL** (not the external one — internal is faster and
   doesn't count against bandwidth when your web service is also on Render).
3. **New → Web Service**, connect the repo, set:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run render-start` (runs `prisma migrate deploy` then starts the server, so schema changes apply automatically on every deploy)
4. Add environment variables on the web service: `DATABASE_URL` (from step 2), `JWT_SECRET`, `JWT_EXPIRES_IN`, `OPENALEX_MAILTO`. Render sets `PORT` for you automatically — no need to add it yourself.
5. Deploy. First build takes a few minutes; you'll get a `https://<name>.onrender.com` URL.
6. Seed data one time via Render's **Shell** tab on the web service: `npm run prisma:seed`.

**Free-tier things worth knowing for a 5-week class project:**
- The free Postgres database **expires 30 days after creation**, with a 14-day grace period to upgrade before data is deleted — comfortably covers a 5-week timeline, but don't let it sit past week 6.
- Free web services **spin down after 15 minutes of inactivity** and take about a minute to wake back up. Hit your API URL a couple minutes before your progress-report demo or final defense so it's already warm.
- No credit card required for any of this.

## What's intentionally left for the next phase

- **OpenAlex integration** — `Work.source = OPENALEX` and `rawResponse` are
  already modeled so the next step is a service that fetches from
  `https://api.openalex.org/works`, maps results into `Work` rows with
  `status: PENDING`, and stores the raw payload for audit purposes.
- **Frontend wiring** — swapping the mock data / `mockSearch()` in `App.tsx`
  for real calls to these endpoints.
