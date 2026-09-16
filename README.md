# Wiki Pulse

A small event-analytics dashboard, fed by live edits from Wikipedia.

Wiki Pulse listens to the public [Wikimedia RecentChanges stream](https://stream.wikimedia.org/v2/stream/recentchange), samples a slice of it into PostgreSQL, and charts it. You can filter by time range, bucket interval and event type, and group by event, page or wiki language. It also has a generic `/api/track` endpoint and a drop-in `tracker.js`, so the same pipeline can record events from any website.

## Features

- **Live data.** A Deno worker samples Wikipedia edits and writes them in batches. Rows older than 7 days are deleted.
- **Dashboard chart.** Line, area, bar and stacked-bar views, with up to 10 series. Click a legend item to hide or show its series.
- **Filters that live in the URL.** Range (`15m` to `60d`), interval, event type and group-by. Filter changes are debounced, and a request that is superseded is aborted.
- **Insights and by-type tables.** Headline totals (events, wikis, paths) and a breakdown by event type.
- **Caching.** Queries run behind Next.js `"use cache"`. The dashboard refreshes in the background every 5 minutes, and the Refresh button drops the cache first.
- **Event tracking.** `POST /api/track` plus `public/tracker.js`, which sends a `pageview` on load and exposes `window.wikipulse()` for custom events.

## Tech stack

| Layer          | Tools                                                    |
| -------------- | -------------------------------------------------------- |
| App            | Next.js 16 (App Router, Cache Components), React 19, TypeScript |
| UI             | Tailwind CSS 4, Recharts 3, Tabler Icons                 |
| Data           | PostgreSQL (Neon in production), Prisma 7 with the `pg` driver adapter |
| Validation     | Valibot                                                  |
| Data collector | Deno 2, `eventsource`                                    |
| Tooling        | pnpm, ESLint, Docker Compose (local Postgres)            |

## How it fits together

```
Wikimedia SSE stream ──► data-collector (Deno) ──┐
                                                  ├──► PostgreSQL ◄── Next.js app
Any website + tracker.js ──► POST /api/track ────┘                    ├─ /dashboard (server render)
                                                                      ├─ GET /api/dashboard/events
                                                                      └─ GET /api/dashboard/insights
```

Everything is stored in one `Event` table and scoped to an `Organization`. The dashboard always shows the `Wikipedia` organization, which the seed script creates.

## Getting started

### Prerequisites

- Node.js 20 or newer, and [pnpm](https://pnpm.io)
- [Deno](https://deno.com) 2.x, to run the data collector
- Docker, for a local Postgres (or any PostgreSQL connection string)

### 1. Install dependencies

```bash
pnpm install
cd data-collector && pnpm install && cd ..
```

### 2. Configure the environment

Create `.env` in the project root. The Next.js app, the Prisma CLI and the data collector all read it.

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextjs_dev?schema=public"

# Production only: a direct (non-pooled) connection for migrations
# DATABASE_URL_UNPOOLED="postgresql://..."
```

| Variable                | Required | Used by                                                  |
| ----------------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`          | yes      | App, Prisma CLI, seed, data collector                     |
| `DATABASE_URL_UNPOOLED` | no       | Prisma CLI when `NODE_ENV=production` (PgBouncer does not support the advisory locks migrations need) |
| `TRACKER_KEY`           | no       | `/api/track` (read, but not enforced yet)                |

### 3. Start the database, then migrate and seed

```bash
docker compose up -d                        # Postgres 17 on localhost:5432
pnpm prisma migrate dev --name init         # create the tables
pnpm prisma generate                        # generate the client into generated/prisma
pnpm prisma db seed                         # demo orgs, ~10k mock events, the Wikipedia org
```

> `prisma/migrations/*` is git-ignored, so on a fresh clone the first `migrate dev` creates the migration locally.

### 4. Run it

```bash
pnpm dev                     # http://localhost:3000
pnpm start:data-collector    # in a second terminal: stream Wikipedia edits into the DB
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard). The collector flushes a batch every 5 minutes, so new edits show up after the first flush.

## Scripts

| Command                     | What it does                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                  | Start the Next.js dev server                                      |
| `pnpm build`                | `prisma generate`, `prisma migrate deploy`, then `next build`     |
| `pnpm build:prod`           | Same as `build`, with `NODE_ENV=production`                       |
| `pnpm start`                | Serve the production build                                        |
| `pnpm lint`                 | Run ESLint                                                        |
| `pnpm start:data-collector` | Run the Deno collector with the root `.env`                        |

## Project structure

```
app/
  (marketing)/          Landing (/) and pricing (/pricing) pages
  (dashboard)/
    dashboard/          Dashboard page: filters, chart, extra tables
    alerts/             Placeholder
  api/
    dashboard/events/   Chart series for client-side filter changes
    dashboard/insights/ Insights strip and by-type table
    track/              Event ingestion endpoint
lib/
  queries/              SQL queries, cache setup, filter parsing
  db/                   Shared Prisma client
  components/           Shared UI (header, footer, logo)
data-collector/         Deno worker: Wikimedia SSE → batched inserts, 7-day cleanup
prisma/                 Schema, seed, and the database handbook
public/tracker.js       Browser tracking snippet
```

## Tracking events from your own site

```html
<script src="http://localhost:3000/tracker.js" data-org="<organization id>"></script>
<script>
  wikipulse("signup", "button", { method: "github" });
</script>
```

`data-org` is the numeric `Organization.id`. `public/tracker-test-page.html` is a ready-made test page.

Or call the endpoint directly:

```bash
curl -X POST http://localhost:3000/api/track \
  -H "Content-Type: application/json" \
  -d '{"type":"pageview","path":"/pricing","host":"example.com","org_id":"1"}'
```

## Database

The schema has three models: `Organization`, `User` and `Event`. Events are indexed on `(org_id, timestamp)` and `(org_id, type, timestamp)`.

[prisma/README.md](prisma/README.md) covers the full workflow: local Docker setup, migrations against Neon, seeding, and recovering from failed migrations.

## Known limitations

- The dashboard is hard-wired to the `Wikipedia` organization. There is no auth or org switching yet.
- `/api/track` does not check `TRACKER_KEY` yet, and allows requests from any origin.
- `tracker.js` sends events to `http://localhost:3000`. Change this before deploying.
- The Alerts page is a stub.
- The `build:data-collector` script is broken. Install the collector's dependencies with `cd data-collector && pnpm install` instead.
