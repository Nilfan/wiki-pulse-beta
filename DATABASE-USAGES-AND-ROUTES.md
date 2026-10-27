# Database usages and possible routes

Source audit: 2026-10-27. Covers handwritten application, collector, and seed code; no live database was queried. Proposed routes below are ideas, not implemented endpoints.

## Stored data

Source: `prisma/schema.prisma`.

| Model | Fields | Current use |
| --- | --- | --- |
| Organization | id, name, slug | Seeded organizations; Wikipedia resolved by name for dashboard and collector. Slug has no runtime lookup. |
| User | id, email, org_id, role | Schema only; no runtime reads/writes found. Roles: ADMIN, OWNER, VIEWER, MEMBER. |
| Event | id, org_id, type, path, host, timestamp, session_id, user_agent, country, properties | Tracking ingestion, Wikipedia collection, analytics, public feed, retention cleanup. |

Event indexes: `(org_id, timestamp)` and `(org_id, type, timestamp)`.

Field semantics and limits:

- `country` means language edition for Wikipedia collector records, but geographic country from the request header for `/api/track`. These meanings must be separated before general geographic reporting.
- `properties` is a JSON column, but both ingestion paths currently store stringified JSON. Collector properties contain `title`; current analytics do not read properties.
- `session_id` and `user_agent` are written by tracking but unused by current read queries. Collector records do not populate them. They cannot support Wikipedia visitor/session reporting.
- `host` supports distinct wiki counts and recent-event links; current grouping/filter dimensions omit host.
- Counts describe retained sampled records, not all Wikimedia changes. Collector config specifies up to 20 events/minute, a two-minute flush, and deletion after 21 days every six hours. These are configuration values, not runtime observations.

## All runtime database access

| Source | Operation and data | Consumers |
| --- | --- | --- |
| `lib/queries/organizations.ts` | Organization.findFirst by Wikipedia name; selects id | Dashboard reads, heartbeat, dashboard refresh action |
| `lib/queries/events.ts` | Raw Event aggregation by time bucket and optional type/path/country groups; totals and bounded series | Dashboard initial chart/tables; GET `/api/dashboard/events` |
| `lib/queries/insights.ts` | Raw Event aggregation: event count, distinct hosts, distinct host/path pairs, latest timestamp, bucket metrics and event-type counts | Dashboard insights/type table; GET `/api/dashboard/insights` |
| `lib/queries/breakdown.ts` | Raw Event aggregation by type/path/country; ranking, totals, pagination, search, filter facets | Dashboard tables and filter dropdowns; GET `/api/dashboard/breakdown` |
| `lib/queries/recentEvents.ts` | Raw Event read: id, timestamp, type, path, host, country; latest first | Dashboard recent table; GET `/api/dashboard/recent`; CSV export |
| `lib/queries/heartbeat.ts` | Event.findFirst by org, newest timestamp only | Dashboard layout header; GET `/api/dashboard/heartbeat` |
| `lib/queries/feed.ts` | Event.findMany, newest 500 at snapshot cutoff; Event.count at cutoff; no org filter | Landing FeedBlock and replay; GET `/api/feed` |
| `app/api/track/route.tsx` | Event.create; connects supplied org_id; stores type/path/host, server timestamp, optional session/properties, request user-agent and country header | POST `/api/track`; OPTIONS only supplies CORS response |
| `data-collector/wikiSourceService.ts` | Organization.findFirst; Event.createMany for sampled Wikimedia changes | Collector startup and batch flush |
| `data-collector/intervalDbCleaner.ts` | Event.deleteMany older than configured retention; no org filter | Collector interval cleanup |

Dashboard Event queries use Wikipedia's organization ID. Analytics support time windows and eventType/page/country filters; heartbeat intentionally ignores filters. Grouping supports event/page/country. Shared SQL/filter construction lives in `lib/queries/eventFilters.ts`; URL validation in `dashboardSearchParams.ts` and `timeWindow.ts` does not itself query the DB.

Initial dashboard rendering calls queries directly through ChartWrapper, ExtraTablesWrapper, and the header Heartbeat. Browser updates call API routes. `app/(dashboard)/dashboard/actions.ts` resolves the organization and invalidates its query cache; it does not change database records. Cached query results can lag ingestion.

## Infrastructure and non-runtime usage

- `lib/db/index.ts`: shared app Prisma client through PostgreSQL driver adapter and DATABASE_URL.
- `app/api/getPrismaClient.ts`: separate tracking Prisma client/pool.
- `data-collector/get-prisma-client.ts`: collector client factory with development-database selection. `lib/collector-config.ts` currently sets FORCE_DEV_DB=true; confirm actual target before operational conclusions.
- `prisma/seed.ts`: reads organizations, creates organizations/events, and truncates Event/User/Organization with identity reset before seeding. Do not run it to inspect data.
- `prisma.config.ts`, schema and migrations: CLI connection/schema lifecycle. Package build scripts run migration deployment before Next build.
- `data-collector/wikiSourceService.test.ts`: injected Prisma test double, not another production data consumer. `lib/db/schema.ts` is empty.

## Existing route inventory

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/` | Marketing page with database-backed sampled feed/replay |
| GET | `/flow` | Static pipeline explanation; no direct database query |
| GET | `/dashboard` | Chart, insights, breakdowns, recent events; shared header heartbeat |
| GET | `/alerts` | TBD placeholder; shared dashboard layout still reads heartbeat |
| GET | `/api/feed` | Latest 500 retained events and retained count across organizations |
| GET | `/api/dashboard/events` | Time series, at most 10 selected series |
| GET | `/api/dashboard/insights` | Summary and bucket/type metrics |
| GET | `/api/dashboard/breakdown` | dimension=event/page/country; offset, limit (max 500), q, facet, until plus dashboard filters |
| GET | `/api/dashboard/recent` | Latest 50 filtered records; format=csv exports up to 5,000 |
| GET | `/api/dashboard/heartbeat` | Latest org event time and check time |
| POST, OPTIONS | `/api/track` | Write event; CORS preflight |

`/dashboard#recent-events` is an anchor, not another page route. Shared analytics URL parameters: range, start, end, interval, eventType, page, country, groupBy; repeated values support multiple selections. `/api/dashboard/heartbeat` does not use them. `/api/getPrismaClient.ts` is a helper, not a route.

## Possible additional routes

| Priority | Proposed page | Proposed API or reuse | Data and work required |
| --- | --- | --- | --- |
| 1 | `/events` | Reuse `/api/dashboard/recent`; add cursor pagination | Dedicated searchable event explorer; existing fields suffice |
| 1 | `/pages` | Reuse breakdown dimension=page | Ranked pages with counts/share; use host+path if distinguishing editions |
| 1 | `/languages` | Reuse breakdown dimension=country | Ranked Wikipedia language editions; scope to collector data |
| 1 | `/event-types` | Reuse insights and breakdown dimension=event | Event mix, filtered trends, counts/share |
| 1 | `/status` | Reuse heartbeat; optional `/api/dashboard/status` | Freshness is available now; collector uptime/flush/failure history needs new telemetry |
| 2 | `/wikis` | New `/api/dashboard/wikis`, or extend breakdown with host | Rank hosts; add host filter/group support |
| 2 | `/wikis/[host]` | Extend existing analytics with validated host filter | Trends, pages and events for one wiki |
| 2 | `/events/[id]` | New `/api/dashboard/events/[id]` | Org-scoped detail query; decide whether properties/user-agent/session should be exposed |
| 2 | `/compare` | Reuse queries for two windows or add comparison endpoint | Period comparisons from retained data; validate available history |
| 3 | `/alerts` (finish existing page) | New `/api/alerts` and evaluator | Rules, notification destinations, delivery/history storage and background evaluation are absent |
| 3 | `/settings/organization` | New `/api/organizations/[slug]` | Existing organization fields; requires authenticated org access and management operations |
| 3 | `/settings/members` | New `/api/organizations/[slug]/members` | User/role schema exists; authentication, authorization and invitation flow are absent |
| 3 | `/sessions` | New session analytics API | Only meaningful for tracker data after confirming session coverage; not Wikipedia visitor analytics |

Start with events, pages, languages, event types and freshness status: these have the strongest support from existing queries. New page routes are optional; filtered dashboard links can provide several of these views without adding endpoints.

## Boundaries to resolve before expanding exposure

- Public feed currently lacks organization scoping. Its total is retained rows, despite the type comment saying “ever tracked”; retention deletes history.
- Tracking's trackerKey mismatch branch is empty, so the key check does not reject requests. No authentication or org authorization was found in the inspected route handlers/layout or middleware/proxy file inventory.
- Cleanup deletes old events across all organizations. It runs only while the collector process schedules it.
- The UI offers a 60-day range while configured retention is 21 days; older data availability is not guaranteed.
- Page-only grouping merges identical paths across hosts. Use host+path for wiki-specific page identities.

Verification: enumerated page and route files, traced query imports to server components/browser fetches, and searched handwritten TypeScript/JavaScript for Prisma clients, raw SQL, PostgreSQL pools and database operations. No application code or database data was changed.
