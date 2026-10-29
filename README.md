# Wiki Pulse

## Assistant chat (phases one through five)

The assistant transport runs as a separate Node.js process beside the backend
Next.js instance. It connects to a separately running Ollama service and lazily opens a
read-only analytics connection when a database instrument is called. The existing Next.js startup commands are unchanged.
The dashboard includes a collapsible chat panel using AI SDK React hooks.

```bash
# Run alongside the backend; these scripts explicitly set APP_ROLE=backend.
pnpm start:assistant
# Development with restart on file changes:
pnpm dev:assistant
pnpm test:assistant
```

The service reads the root `.env`. Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ROLE` | none | Must be `backend`; otherwise startup fails before listening |
| `ASSISTANT_HOST` | `127.0.0.1` | Bind address; use a private interface for container networking |
| `ASSISTANT_PORT` | `3001` | Private service port |
| `ASSISTANT_INTERNAL_URL` | `http://127.0.0.1:3001` | Next.js server-only rewrite upstream (build-time in production) |
| `ASSISTANT_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated exact frontend origins, including scheme and port |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Server-only Ollama URL; an optional trailing `/api` is accepted |
| `OLLAMA_MODEL` | `bonsai-2:9b` | Installed Ollama model name |

`GET /healthz` reports transport availability only. WebSocket connections use
`/ws/assistant`; requests with missing or unlisted origins are rejected. This
origin check is not user authentication. The transport accepts at most 64 KiB
per message. The production entry point configures Ollama generation;
`ASSISTANT_NOT_READY` applies to service instances created without a handler.
It pings clients every 30 seconds and terminates clients that miss the next
heartbeat. SIGINT/SIGTERM close connections with code 1001, allowing up to five
seconds before forcing cleanup.

In production, supervise the assistant process alongside the backend process and
set allowed origins to the actual frontend origins. The browser connects to `/api/assistant-ws` on the frontend host. Next.js rewrites
that path to the private service at `/ws/assistant`. An optional direct proxy
configuration is in
[`deploy/assistant.nginx.conf.example`](deploy/assistant.nginx.conf.example).
Keep the service port private. The Next.js external rewrite handles WebSocket
upgrades independently of the HTTP API forwarding helper. Proxy installation and live deployment are not
performed by this setup.

### Assistant protocol v1

Each WebSocket text frame is one JSON object. Submit the bounded conversation
history using AI SDK text message parts; client-supplied system messages, tools,
attachments, and extra fields are rejected:

```json
{"version":1,"type":"chat","requestId":"request-1","messages":[{"id":"user-1","role":"user","parts":[{"type":"text","text":"What is Wiki Pulse?"}]}]}
```

Limits: 32 messages, eight text parts per message, 8,000 characters per part,
24,000 total text characters, unique message IDs, and a final user message.
Request/message IDs contain 1–128 letters, digits, underscores, or hyphens.
Binary frames and malformed JSON are rejected with `INVALID_FRAME`; invalid
frames use `requestId: null` because their contents are untrusted. Frames above
64 KiB close the connection with WebSocket code 1009.

The generation handler is injectable in `server/assistant/service.ts` and the
entry point wires `server/assistant/ollama.ts`. The service emits:

```json
{"version":1,"type":"accepted","requestId":"request-1"}
{"version":1,"type":"chunk","requestId":"request-1","chunk":{"type":"start","messageId":"assistant-1"}}
{"version":1,"type":"chunk","requestId":"request-1","chunk":{"type":"text-start","id":"text-1"}}
{"version":1,"type":"chunk","requestId":"request-1","chunk":{"type":"text-delta","id":"text-1","delta":"Wiki Pulse collects sampled events."}}
{"version":1,"type":"chunk","requestId":"request-1","chunk":{"type":"text-end","id":"text-1"}}
{"version":1,"type":"chunk","requestId":"request-1","chunk":{"type":"finish"}}
{"version":1,"type":"done","requestId":"request-1","reason":"completed"}
```

`chunk` carries the SDK's `UIMessageChunk` type unchanged. The later browser
transport will unwrap these frames into the SDK stream; this WebSocket protocol
does not add SSE formatting or a `[DONE]` string. `done` or `error` ends a request.
Errors have `type: "error"`, `code`, and a safe `message`.

Cancel with `{"version":1,"type":"cancel","requestId":"request-1"}`.
Cancellation emits `done` with reason `cancelled`; a 30-second timeout emits
`TIMEOUT`. Cancellation, disconnect, timeout, and service shutdown abort the
handler and suppress further chunks. A slot stays occupied until the handler
settles, so handlers must honor their abort signal. There is one generation per
connection and one per service process by default; excess requests receive
`BUSY`. Service options can override the process concurrency and timeout.

Other errors are `DUPLICATE_REQUEST`, `UNKNOWN_REQUEST`, `ASSISTANT_NOT_READY`,
and `GENERATION_FAILED`. IDs consumed by valid, non-busy chat requests cannot be
reused on the same connection. After 1,000 such IDs the service requires a new
connection (code 1008). Slow consumers exceeding 256 KiB of queued output are
disconnected. Reconnection starts an empty session: there is no stored history,
stream resumption, or automatic replay; send history with a fresh request ID
only on an explicit new submission. Concurrency limits apply per process.

### Ollama setup and verification

```bash
ollama serve                       # if Ollama is not already running
ollama pull bonsai-2:9b            # once, if the model is not installed
pnpm start:assistant
# Optional real-model test (uses the configured URL/model):
ASSISTANT_LIVE_TEST=1 pnpm test:assistant
```

The adapter uses AI SDK and `ollama-ai-provider-v2` with Ollama's native chat
endpoint. Requests use `num_ctx: 8192`, `num_predict: 1024`, `think: false`,
and no automatic retries. The existing 30-second request deadline includes cold
model loading. Aborting closes the upstream request; immediate release of model
resources depends on Ollama. Keep Ollama private and reachable from the backend;
`127.0.0.1` refers to the backend's own host/container.

Transient `data-status` chunks report `loading` while waiting for output and
`generating` when the first text arrives. `loading` is a waiting state, not a
measurement of Ollama's internal model loader. Failures use safe errors:
`OLLAMA_UNAVAILABLE` for connection failures, `MODEL_NOT_FOUND` for HTTP 404,
`MODEL_LOADING` for HTTP 503 (busy/loading), and `GENERATION_FAILED` for other
upstream or empty-output errors. SDK error chunks become one terminal protocol
error, without forwarding raw upstream details. `/healthz` remains a transport
liveness check and does not load or probe the model.

Tests use controlled Ollama responses by default; the real-model test is opt-in.
The assistant has ten read-only instruments described below.

### Browser transport

`lib/assistant/websocket-transport.ts` exports `AssistantWebSocketTransport`,
which implements the installed AI SDK's `ChatTransport<UIMessage>` interface.
Create a stable instance for the chat component and pass it as `transport` to
`useChat` when the UI is added. Call `transport.close()` on unmount. The class
does not connect until `sendMessages` is called, so construction is safe during
server rendering. Provide an explicit URL or a function resolving a URL in the
browser, for example:

```ts
const transport = new AssistantWebSocketTransport({
  url: "wss://your-frontend.example/api/assistant-ws",
});
```

For local development the browser uses `ws://localhost:3000/api/assistant-ws`.
HTTPS frontends use `wss://` on the same host. Allow the frontend origin on the
assistant service; the proxy preserves that origin. No internal service address
or Ollama URL is supplied to the browser transport.

Each submission opens one connection with a fresh request ID. A second send on
the same transport is rejected while one is active. AI SDK abort signals and
stream cancellation send `cancel` when possible and close the connection.
`reconnectToStream()` returns `null`: retries require an explicit new submission.
Successful completion, errors, and cancellation release socket listeners and
timers. Connection establishment is limited to 10 seconds and the entire request
to 45 seconds (both configurable); the backend's 30-second generation deadline
still applies. Buffered event/chunk queues are bounded.

Outgoing text history is validated against the shared contract before connecting.
Incoming chunks are validated with AI SDK's chunk schema before enqueueing;
malformed responses fail the stream. Unrelated request IDs are ignored.
`AssistantTransportError.code` distinguishes server errors, disconnects, connection
failures, timeouts, invalid messages, and invalid responses. The test suite covers
the browser WebSocket event interface and a real local socket feeding
`readUIMessageStream`; rendered browser UI verification was unavailable in this session.


### Dashboard chat

Use **Ask AI** in the bottom-right corner of any dashboard workspace page.
The panel supports streamed replies, Stop, Clear conversation, Enter to send,
Shift+Enter for a new line, and Escape to minimize. Conversation state stays in
memory across workspace navigation and panel minimization; reloading clears it.
There is no local storage or database persistence. Unmounting aborts generation;
minimizing keeps the current response running.

The chat always connects to the current host's `/api/assistant-ws`, using `ws://`
on HTTP and `wss://` on HTTPS. Next.js proxies that endpoint to
`http://127.0.0.1:3001/ws/assistant` by default. Run Next.js on port 3000 and the
assistant on port 3001 for local development. Port 3001 stays private.

For split deployments, set the server-only `ASSISTANT_INTERNAL_URL` to the
assistant service's HTTP(S) origin, e.g. `http://assistant.internal:3001`, before
building/restarting Next.js. The rewrite adds `/ws/assistant`; the origin must
not include a path, credentials, query, or fragment. Production builds bake in
rewrites, so rebuild after changing this setting. `NEXT_PUBLIC_ASSISTANT_WS_URL`
is no longer used. Configure the assistant's allowed origins with the frontend's
public origin, not the private upstream origin. Hosting must support WebSocket
upgrades; the optional Nginx example exposes the same `/api/assistant-ws` path.

The panel shows preparing/replying states and connection errors. It accepts up
to 4,000 characters per submission; transport conversation limits still apply.
Start a new conversation with Clear when history reaches those limits. Assistant replies render as Markdown (headings, lists, emphasis, quotes, links,
tables, and fenced code blocks); user messages remain plain text. Tables and
code blocks scroll horizontally within the panel. Raw HTML is skipped and
remote images are shown as alt text. The panel identifies its access as read-only and describes activity as sampled. Browser visual and
interaction verification could not run because the browser host was unavailable.

A small event-analytics dashboard, fed by live edits from Wikipedia.

Wiki Pulse listens to the public [Wikimedia RecentChanges stream](https://stream.wikimedia.org/v2/stream/recentchange), samples a slice of it into PostgreSQL, and charts it. You can filter by time range, bucket interval and event type, and group by event, page or wiki language. It also has a generic `/api/track` endpoint and a drop-in `tracker.js`, so the same pipeline can record events from any website.

## Features

- **Live data.** A Deno worker samples Wikipedia edits and writes them in batches. Rows older than 21 days are deleted.
- **Dashboard chart.** Line, area, bar and stacked-bar views, with up to 10 series. Click a legend item to hide or show its series.
- **Filters that live in the URL.** Range (`15m` to `60d`, or a custom start/end period up to 60 days), interval, event type and group-by. Custom periods use local date-time pickers and persist as exact UTC timestamps in the URL. Hold the left mouse button and drag across the chart to select a custom period, then confirm with Apply range. Cancel or Escape discards the selection. Filter changes are debounced, and a request that is superseded is aborted.
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
pnpm dev:local               # start Docker Postgres, then the dev server
pnpm seed:local              # load 5,000 supplied fixture events into local Postgres
pnpm start:data-collector    # in a second terminal: stream Wikipedia edits into the DB
```

`pnpm dev` always reads app data from the Docker Postgres at
`127.0.0.1:5432/nextjs_dev` (user/password: `postgres`), through local API
handlers for both browser requests and server rendering. In development,
`APP_ROLE`, `BACKEND_API_URL`, and `DATABASE_URL` cannot redirect app reads to
production. Start Docker Postgres first; there is no remote fallback.
Prisma CLI commands and the separately launched collector still use `.env`;
set their `DATABASE_URL` to the local connection above to migrate and populate it.

After creating the local schema and generating Prisma, run `pnpm seed:local`
with Docker Postgres running. This command always targets `127.0.0.1:5432/nextjs_dev`,
regardless of `.env`. It seeds the Wikipedia organization from the supplied CSV
fixture, with `new timestamp = now - (newest original timestamp - original timestamp)`.
The newest event lands at the captured script launch time, and all gaps stay intact.
Each run truncates the entire local `Event` table and resets its IDs, then inserts
the 5,000 fixture rows oldest-first in one transaction. The final row by ID has
the script launch timestamp. Organizations and users are preserved.
Use `pnpm seed:local --dry-run` to validate the fixture without database writes.

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard). The collector flushes a batch every 30 minutes, so new edits show up after the first flush.

## Scripts

| Command                     | What it does                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                  | Start the Next.js dev server                                      |
| `pnpm dev:local`            | Start Docker Postgres, then the Next.js dev server                 |
| `pnpm seed:local`           | Seed local Postgres with timestamp-adjusted Wikipedia fixtures     |
| `pnpm build`                | `prisma generate`, `prisma migrate deploy`, then `next build`     |
| `pnpm build:prod`           | Same as `build`, with `NODE_ENV=production`                       |
| `pnpm start`                | Serve the production build                                        |
| `pnpm lint`                 | Run ESLint                                                        |
| `pnpm start:data-collector` | Run the Deno collector with the root `.env`                        |

## Project structure

```
app/
  (marketing)/          Landing (/) and pipeline flow (/flow) pages
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
data-collector/         Deno worker: Wikimedia SSE → batched inserts, 21-day cleanup
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


## Read-only assistant instruments

The backend exposes ten instruments. Model arguments cannot select an
organization, SQL, endpoint, or arbitrary period. The first four take an empty
object; the additional analytics instruments accept only the bounded arguments
listed below.

| Instrument | Result |
| --- | --- |
| `getPlatformHelp` | Curated platform behavior and current source sampling/flush/retention settings, explicitly distinguished from live collector configuration |
| `getDashboardContext` | Browser filter snapshot, resolved time bounds, or an explicit missing-context result |
| `getActivitySummary` | Sample event total, distinct `(host,path)` pages, wiki hosts, non-null languages, latest event, and top 20 event types for the selected period and filters |
| `getCollectionStatus` | Latest stored Wikipedia event, check time, age, and source configuration; collector process state remains unknown |
| `getActivitySeries` | Zero-filled total activity series; no arguments; at most 120 buckets |
| `getActivityBreakdown` | Counts and backend-calculated percentages by `dimension: "event"` or `"language"`; optional `limit` 1–20 (default 10) |
| `getTopPages` | Rank distinct `(host,path)` pages by count; optional `limit` 1–20 (default 10) |
| `getPageActivity` | Exact stored `path` (starts with `/`, max 512 characters) and wiki `language` code; intersection with existing filters |
| `compareActivityPeriods` | Current period vs the preceding equal-duration period with identical filters; backend calculates changes for events, pages, wikis, languages; no arguments |
| `getRecentEvents` | Newest stored events within current filters; optional `limit` 1–20 (default 10); only ID, time, type, host, path and language |

The browser captures filters on each submission from `/dashboard`; other
workspace pages provide no context. Optional `dashboardContext` on a v1 chat
frame is strictly validated: known periods/intervals/groupings, at most 50 values
per filter (512 characters each), and canonical custom bounds spanning at most
60 days. Context is data, never authorization. No database work runs for help
or context. SQL fixes organization scope to the existing public Wikipedia slug
and applies parameterized filters equally to totals and type counts. The
assistant does not access private organizations or accounts.

Database instruments use a separate lazy pool (two connections), two-second
connection acquisition timeout, read-only transactions, and three-second
statement timeouts. The assistant defaults to development when `NODE_ENV` is unset, matching
`pnpm dev` and its local Postgres even if `.env` has a production database URL.
For production use `NODE_ENV=production pnpm start:assistant`; this uses
`DATABASE_URL` without a local fallback. Startup logs the selected mode and
database source without credentials. `dev:assistant` explicitly sets development. Abort is checked before/after queries; an already running SQL
statement can continue until its database timeout. Data failures return a safe
unavailable result, never invented zero counts. The service closes its database
pool on shutdown. No additional database migration is required.

Tool executions are capped at four per request, outputs at 12,000 characters,
and model generation at three steps (the third has tools disabled for the
answer). The overall generation deadline stays 30 seconds. Tools run only in the
backend; tool frames/results are not forwarded into browser history. The client
shows a checking-information state, then text. Subsequent analytics questions
must be grounded in fresh tool calls, not client-provided history.

Verification commands:

```bash
pnpm test:assistant
ASSISTANT_LIVE_TEST=1 pnpm test:assistant
# Optional read-only SQL integration test against a chosen test database:
ASSISTANT_DB_TEST_URL="postgresql://postgres:postgres@127.0.0.1:5432/nextjs_dev" pnpm test:assistant
```

The SQL test compares unfiltered/empty-filtered summaries and latest-event
freshness with independent queries in the chosen database. It does not write
fixtures or modify data. Arbitrary database requests, database writes, shell/file access,
external browsing, navigation changes, and autonomous tasks beyond these ten
instruments remain unavailable to the assistant.


To verify the Next.js WebSocket proxy using a dedicated local upstream port:

```bash
ASSISTANT_INTERNAL_URL=http://127.0.0.1:34819 pnpm build:frontend
ASSISTANT_PROXY_PORT=34819 ASSISTANT_PROXY_TEST=1 pnpm exec tsx --test server/assistant/proxy.test.ts
pnpm build:frontend # restore the normal upstream in the production build
```

The opt-in test starts its own production Next.js server on a free port and a
private test service, verifies streaming, rejected origins, and cancellation,
then stops both test processes. Choose an unused upstream port if necessary.


### Expanded analytics limits

All four added instruments use the current dashboard time window and every
active value filter. They cannot change the period, organization, or remove a
filter. `getPageActivity` adds exact page/language constraints; conflicting
filters legitimately produce zero events. A zero result is not evidence that
a Wikipedia page does not exist. Use exact paths from the user or top-pages
results, rather than guessing titles or fetching article content.

`getActivitySeries` returns total sample events, not grouped series. It preserves
the selected interval when the window fits within 120 buckets; otherwise it
chooses the smallest supported coarser interval that fits. The result includes
requested/effective intervals and `coarsened`. Boundaries are anchored to the
period end, matching dashboard bucket alignment; the first bucket can be partial.
Counts include only the exact selected half-open period `[since, until)` and
missing buckets are zero-filled.

Rankings sort by count descending with stable value/host/path tie-breakers.
They include full filtered event totals and `otherEvents`, so omitted rows are
not silently treated as the full sample. Breakdown percentages are calculated
in backend code against the whole filtered total, rounded to two decimal places.
Language breakdowns group missing language under `unknown`; summary language
counts continue to exclude nulls. Page rankings keep identical paths on distinct
hosts separate. Inputs are validated before tool execution and again at the
analytics boundary; parameterized queries remain inside read-only transactions.
The shared four-execution/three-step request budget is unchanged.


### Period comparisons and recent events

`compareActivityPeriods` compares `[since, until)` with the adjacent previous
period `[since - duration, since)`. It accepts current dashboard periods up to
30 days, keeping the combined scan within 60 days. Longer selections produce an
explicit request to narrow the period. All value filters remain identical across
both periods, and both counts are calculated in a single SQL statement. Changes
are returned for events, distinct `(host,path)` pages, wikis, and non-null wiki
languages. Percentage change is rounded to two decimals; a zero previous count
with nonzero current count returns `null`, while zero-to-zero returns 0. Stored
samples may have incomplete coverage because of retention, collection gaps, or
sampling changes; the result explicitly warns against treating changes as
whole-Wikipedia trends.

`getRecentEvents` sorts stored rows by timestamp descending, then event ID
descending. It fetches one additional row to report `hasMore`, but exposes at
most the requested 1–20 records. It does not return event properties, user agents,
session identifiers, or article content. Returned records are not a live stream.
Both instruments require dashboard context and share the existing read-only
transaction, validation, timeout, output-size, and tool-call limits. Matching
chat suggestions are available on the dashboard.


### Assistant topic scope

The server system instructions restrict replies to dashboard filters, charts,
metrics, sampling, retention, freshness, and collected Wikipedia activity
available through the tools. General encyclopedia/article-content questions,
coding tasks, recipes, unrelated advice, and role/scope override requests are
refused. Mixed requests receive only the dashboard-data answer; ambiguous
requests get a dashboard-focused clarification. Explanations and translations
of dashboard answers remain allowed. The UI describes this scope next to the
composer. These are model behavior instructions, tested against local Bonsai;
the separate read-only tool and database restrictions remain enforced in code.
