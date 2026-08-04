# Database & Migrations Handbook

How the database is set up, run locally, migrated, and un-broken when a migration goes
wrong. Stack: **Prisma 7** (`prisma-client` generator, driver adapters) · **PostgreSQL** ·
**Neon** in production · **pnpm**.

---

## 1. Mental model: `generate` vs `migrate` vs `db push`

Most migration confusion comes from mixing these three. They do different things:

| Command                         | Touches the **client** (TS code/types) | Touches the **database** (tables) | Keeps migration **history**   |
| ------------------------------- | -------------------------------------- | --------------------------------- | ----------------------------- |
| `prisma generate`               | ✅ yes                                 | ❌ no                             | ❌ no                         |
| `prisma migrate dev` / `deploy` | ❌ no                                  | ✅ yes                            | ✅ yes (`_prisma_migrations`) |
| `prisma db push`                | ❌ no                                  | ✅ yes                            | ❌ **no**                     |

Key takeaways:

- `generate` only builds the TypeScript client you import (`prisma.event.count()`). It
  **never creates tables**. A green build with a generated client says nothing about
  whether the DB has any tables.
- Tables are created by **migrations** (`migrate deploy`) or by **`db push`**.
- **Pick one workflow and stick to it.** `db push` writes schema to the DB _without_
  recording history; `migrate` writes history into a bookkeeping table called
  `_prisma_migrations`. Mixing them is what produces the `P3005` error (see Q&A).

> **Rule for this project:** use `migrate`. Never use `db push` once `prisma/migrations/`
> exists.

---

## 2. Environment variables

Neon gives two connection strings. They are **not** interchangeable:

- **Pooled** (host contains `-pooler`, routed through PgBouncer) → for the app at runtime.
  Serverless functions open many short-lived connections; the pooler keeps you under
  Postgres' connection limit.
- **Direct** (no `-pooler`) → for migrations and `db push`. The pooler runs in transaction
  mode and cannot run schema-changing SQL (DDL) or migration bookkeeping — those commands
  hang or fail on it.

Prisma 7 configures the CLI connection in `prisma.config.ts`; `directUrl` in
`schema.prisma` was removed. The running app creates its driver adapter separately from
`DATABASE_URL` (see `lib/db/index.ts`).

```ts
// prisma.config.ts — used by Prisma CLI commands
datasource: {
  url: process.env["DIRECT_URL"],
}
```

`.env` (read by the Prisma CLI and by Next.js):

```bash
# --- Neon (production) ---
DATABASE_URL="postgresql://USER:PASS@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASS@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"
```

Locally (Docker, section 3) both point at the **same** local instance — no pooler exists,
so pooled and direct are identical.

---

## 3. Local database with Docker

You develop and create migrations against a local Postgres, and only ever **deploy** them
to Neon. This keeps experiments off production and avoids Neon shadow-database issues
(see the note in section 4).

### 3.1 `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17
    container_name: nextjs-local-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nextjs_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3.2 Local env (`.env.local` for the app, `.env` for the Prisma CLI)

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextjs_dev?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/nextjs_dev?schema=public"
```

### 3.3 Container commands

```bash
docker compose up -d        # start Postgres in the background
docker compose ps           # check it's running / healthy
docker compose logs -f postgres
docker compose down         # stop (keeps data in the volume)
docker compose down -v      # stop AND wipe the volume (fresh DB next time)
```

### 3.4 First-time initialization

```bash
docker compose up                             # 1. start the DB in terminal #1
pnpm prisma migrate dev --name init           # 2. create + apply the migration in terminal #2
pnpm prisma generate                          # 3. generate the Prisma Client
pnpm prisma db seed                           # 4. load seed data (see section 5)
```

After this you have a local DB whose schema is tracked by migrations and populated with
seed data. To start completely fresh at any time: `docker compose down -v` then repeat.

---

## 4. Everyday migration workflow

```
edit schema.prisma
      │
      ▼
pnpm prisma migrate dev --name <change>     ← LOCAL only (Docker)
      │   creates prisma/migrations/<ts>_<change>/migration.sql
      │   applies it to the local DB
      │   Prisma 7 does NOT generate the client or run the seed
      ▼
pnpm prisma generate
pnpm prisma db seed
      ▼
git add prisma/migrations && git commit
      │
      ▼
deploy  →  pnpm prisma migrate deploy        ← against NEON (CI / build)
           applies only pending migrations, no shadow DB, no generate
```

- **`migrate dev`** is a _development_ command. It needs a **shadow database** — a
  throwaway DB Prisma creates and drops to detect drift and verify migrations. That's fine
  on local Docker, but you should **never point `migrate dev` at Neon** (production data +
  shadow-DB permission friction). Develop locally, deploy to Neon.
- **`migrate deploy`** is the _production_ command: it only applies already-created
  migration files, never generates new ones, never touches a shadow DB.

### Build / deploy configuration

```jsonc
// package.json
"scripts": {
  "build": "prisma generate && prisma migrate deploy && next build"
}
```

- Use `&&`, **not** `;`. `;` runs the next command even if the previous one failed, so a
  broken `generate` or `deploy` wouldn't stop `next build` and you'd get a confusing later
  error instead of the real one.
- Call `prisma` directly (keep it in `devDependencies`), not `pnpm dlx prisma` / `npx`,
  which re-downloads Prisma on every build and can drift versions.
- Keeping `prisma generate` in `build` (or a `postinstall`) matters because Vercel caches
  `node_modules`, and a client with a **custom `output`** directory is not regenerated
  automatically.

---

## 5. Seeding

`prisma/seed.ts` inserts 3 organizations and between 10,000 and 10,999 synthetic events.
Run it through the Prisma seed command:

```bash
pnpm prisma db seed       # runs tsx prisma/seed.ts via prisma.config.ts
```

Prisma 7 does not automatically run the seed after `prisma migrate dev`; invoke
`pnpm prisma db seed` explicitly. The command registered in `prisma.config.ts` tells
`prisma db seed` what to execute.

---

## 6. Troubleshooting Q&A

### Q1 — `The table public.Event does not exist in the current database` (at runtime)

**Cause:** the client was generated and the app built, but the **tables were never created**
in that database. `generate` ≠ `migrate`. The DB is reachable (so `DATABASE_URL` is fine) —
it's just empty.

**Fix:**

```bash
# make sure DATABASE_URL/DIRECT_URL point at the target DB
pnpm prisma migrate deploy        # applies existing migrations
# or, if prisma/migrations/ doesn't exist yet:
pnpm prisma migrate dev --name init   # LOCAL, creates the first migration
```

Then ensure `migrate deploy` runs on deploy (build script in section 4).

---

### Q2 — `P3005 The database schema is not empty`

**Cause:** the DB already has tables **but no migration history** (`_prisma_migrations` is
missing). This happens when you created the schema with `db push` (or by hand) and then run
`migrate deploy`, which refuses to touch a DB whose history it doesn't recognize.

**Fix — pick one (both are one-off, run locally, NOT in the build):**

_Option A — baseline (keep existing schema & data)._ Tell Prisma the migration is already
applied, without running its SQL:

```bash
pnpm prisma migrate resolve --applied <migration_folder_name>
# e.g. 20260804120000_init  (the folder under prisma/migrations/)
```

This creates `_prisma_migrations`, marks that migration as applied, and executes nothing.
Valid only if the DB schema actually matches that migration — which it does if you generated
both from the same `schema.prisma`.

_Option B — reset (nuke & replay, simplest here)._

```bash
pnpm prisma migrate reset
```

Drops the schema and replays every migration from scratch. Afterwards run
`pnpm prisma db seed` explicitly. This gives you a clean migration-tracked DB. **Destroys data** — fine at this
stage (the seed is repeatable). Needs the **direct** URL (runs DDL).

After either, your normal `migrate deploy` build passes.

---

### Q3 — A migration was created but is **empty / not recorded**

**Cause:** `migrate dev` diffs `schema.prisma` against the DB. If the DB already has the
change (e.g. you'd previously run `db push`), there's no diff, so Prisma writes an **empty**
migration — or reports "already in sync" and records nothing.

**Fix:**

```bash
# 1. delete the empty migration folder
rm -rf prisma/migrations/<ts>_<name>

# 2a. if the DB has the schema but no history → baseline it
pnpm prisma migrate resolve --applied <first_real_migration>

# 2b. OR, if data is disposable, just reset to a clean history
pnpm prisma migrate reset
```

Root cause is always a `db push` (or manual change) sneaking in. Drop `db push` from the
workflow and the empty-migration problem disappears.

---

### Q4 — A wrong migration was applied / **columns don't match the schema** (drift)

"Drift" = the DB's actual structure no longer matches the migration history (a bad
`ALTER`, a manual edit, a half-applied migration).

**In development (data disposable) — reset:**

```bash
pnpm prisma migrate reset
```

**Fix-forward (keep data) — write a corrective migration:**

```bash
# edit schema.prisma to the CORRECT desired state, then:
pnpm prisma migrate dev --name fix_<what>
# Prisma generates the ALTER that reconciles DB → schema
```

**Inspect the exact drift before deciding:**

```bash
pnpm prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script                 # prints the SQL that would bring the DB up to schema
```

**If a migration failed halfway on deploy** (marked failed in `_prisma_migrations`, and
every later `migrate deploy` now refuses):

```bash
# 1. mark the failed migration as rolled back
pnpm prisma migrate resolve --rolled-back <migration_folder_name>
# 2. fix the SQL inside that migration's migration.sql
# 3. redeploy
pnpm prisma migrate deploy
```

---

### Q5 — `migrate deploy` hangs or errors on Neon

**Cause:** you're running it through the **pooled** (`-pooler`) URL. PgBouncer can't run
migration DDL/bookkeeping. **Fix:** point migrations at `DIRECT_URL` (section 2). Keep the
pooled URL only for the running app.

---

### Q6 — Build runs `next build` even though Prisma failed

**Cause:** `;` between commands ignores exit codes. **Fix:** use `&&`
(`prisma generate && prisma migrate deploy && next build`).

---

### Q7 — Generated-client import errors when running scripts with `tsx`

The current Prisma 7.8 generator emits extensionless internal imports and works with the
project's `tsx` runner. If a future generator version emits `.js` imports that `tsx` cannot
resolve, set the generated import extension explicitly:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../generated/prisma"
  importFileExtension = "ts"
}
```

Regenerate (`pnpm prisma generate`) afterwards.

---

### Q8 — Prisma 7 client init (for reference)

New generator → import from the generated path **with `/client`**, and pass a driver
adapter (Prisma 7 is "Rust-free" and requires one):

```ts
// lib/db.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

The `globalThis` singleton prevents dev hot-reload from spawning many clients (each opens
its own connections and exhausts Neon's limit). In production the guard is skipped — one
instance per process.

---

## 7. Command cheat-sheet

```bash
# local DB lifecycle
docker compose up -d                     # start local Postgres
docker compose down -v                   # stop + wipe

# develop (LOCAL only)
pnpm prisma migrate dev --name <change>  # create + apply migration
pnpm prisma generate                     # rebuild the client explicitly (Prisma 7)
pnpm prisma db seed                      # (re)seed
pnpm prisma studio                       # inspect data in a browser

# deploy (NEON / CI)
pnpm prisma migrate deploy               # apply pending migrations only
pnpm prisma generate                     # rebuild the client

# rescue
pnpm prisma migrate reset                        # nuke + replay migrations (dev)
pnpm prisma db seed                              # seed explicitly afterwards
pnpm prisma migrate resolve --applied <name>     # baseline existing schema (P3005)
pnpm prisma migrate resolve --rolled-back <name> # clear a failed migration
pnpm prisma migrate diff ...                      # inspect drift
```

> Golden rules: **one workflow** (migrate, never `db push` once history exists) ·
> **`migrate dev` local, `migrate deploy` remote** · **migrations use the direct URL,
> the app uses the pooled URL**.
