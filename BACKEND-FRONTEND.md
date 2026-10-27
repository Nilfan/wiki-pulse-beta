# Separate backend and SSR frontend deployments

Deploy the same source in both environments. Frontend pages are always enabled, including on the backend instance. Local database API handlers are disabled by default and require APP_ROLE=backend; otherwise API routes forward to the configured backend. Server Components always load data over HTTP using the server-only `BACKEND_API_URL`, defaulting to `https://samson-pulse.org/`. The backend must be reachable from the frontend server.

Backend environment:

```dotenv
APP_ROLE=backend
DATABASE_URL=postgresql://...
BACKEND_API_URL=https://samson-pulse.org/
```

Build with `pnpm build:backend`; run with `pnpm start:backend`. This build generates Prisma and deploys migrations. Configure DATABASE_URL_UNPOOLED too if your migration connection differs. Run the collector only in the environment intended to collect data; its development DB selection is independent of APP_ROLE.

Frontend environment:

```dotenv
BACKEND_API_URL=https://samson-pulse.org/
```

Build with `pnpm build:frontend`; run with `pnpm start:frontend`. No DATABASE_URL is required. Prisma generation supplies build-time types; frontend builds do not deploy migrations. The default `build`, `build:prod`, `dev` and `start` commands use frontend behavior when APP_ROLE is unset; builds do not deploy migrations. Backend deployments must explicitly set APP_ROLE=backend in their runtime environment (or use start:backend) and use build:backend for migration deployment.

For local development, run a backend on port 3001 with APP_ROLE=backend and a frontend on port 3000 with APP_ROLE=frontend and BACKEND_API_URL=http://localhost:3001. Use separate checkouts/build directories for concurrent instances. Never point the frontend's BACKEND_API_URL at itself: its API routes forward requests upstream.

## HTTP contract

| Method | Path | Response |
| --- | --- | --- |
| GET | /api/feed | Feed snapshot, retained total, fetchedAt |
| GET | /api/dashboard/events | JSON-safe time series and totals |
| GET | /api/dashboard/insights | Summary, buckets, type counts |
| GET | /api/dashboard/breakdown | Ranked dimension page and snapshot metadata |
| GET | /api/dashboard/recent | Recent events; format=csv for download |
| GET | /api/dashboard/heartbeat | Latest event time and check time |
| POST | /api/dashboard/revalidate | Immediately expires backend organization query cache; {ok:true} |
| POST, OPTIONS | /api/track | Existing event ingestion and CORS behavior |

Analytics endpoints retain existing validation, filtering, pagination and limits. Dashboard query parameters: range, start, end, interval, eventType, page, country, groupBy (multi-value parameters repeat). Breakdown also accepts dimension, offset, limit, q, facet, until.

Browser fetches and exports stay on same-origin /api paths. In frontend mode these handlers forward to the backend, preserving query strings, write bodies, status codes, CSV/download headers and tracking metadata. Cross-origin browser CORS configuration is unnecessary for analytics. Backend handlers dynamically load database code only in backend mode; absent or empty APP_ROLE uses forwarding without loading local database handlers. Frontend rendering remains enabled in both modes.

SSR calls use `lib/api/data.ts`; it imports query contracts as types only. Requests have a 15-second timeout, reject redirects and bypass frontend fetch caching. Existing backend query caching remains authoritative. Refresh calls the backend invalidation endpoint, so it expires the cache in the process that executes database queries. Upstream failures reject SSR data loads and return 502 from the frontend API proxy; there is no fallback database access.

This change preserves the existing public analytics and tracking access policy. No authentication scheme is introduced. The existing trackerKey check remains unenforced; organization-wide feed and cleanup behavior are unchanged.

## Verification

After `pnpm build:frontend`, run `node tools/check-http-split.mjs`. It starts a local mock backend and the production frontend with APP_ROLE unset/empty and an empty DATABASE_URL, checks dashboard SSR requests, analytics forwarding and repeated filters, CSV headers/body, tracking POST/OPTIONS, refresh forwarding, upstream error status and unavailable-backend handling. It does not connect to a database. TEST_FRONTEND_PORT overrides its default port 3219.

## Collector database connections

The collector respects connection URL SSL options instead of forcing TLS on every environment URL. For a PostgreSQL server without SSL support use `?sslmode=disable`; TLS-enabled servers should use their provider's required mode. Check PGSSLMODE too if it is set. Failed TLS connections are not automatically downgraded.

Retention cleanup shares the ingestion Prisma client and its database selection. FORCE_DEV_DB in lib/collector-config.ts still selects the development database when enabled, including for cleanup. Cleanup failures are logged and retried at the next scheduled interval instead of terminating the process. Restart the collector after deploying this change.
