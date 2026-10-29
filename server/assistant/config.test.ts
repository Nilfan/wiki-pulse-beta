import assert from "node:assert/strict";
import { test } from "node:test";
import { assistantMode, databaseConnectionString, LOCAL_DATABASE_URL } from "../../lib/db/connection";

test("bare assistant startup matches the Next.js development database despite a remote .env URL", () => {
  const remote = "postgresql://example.invalid/production";
  assert.equal(assistantMode(undefined), "development");
  assert.equal(databaseConnectionString(assistantMode(undefined), remote), databaseConnectionString("development", remote));
  assert.equal(databaseConnectionString(assistantMode(undefined), remote), LOCAL_DATABASE_URL);
});

test("explicit production keeps configured database and never falls back to local", () => {
  const remote = "postgresql://example.invalid/production";
  assert.equal(databaseConnectionString(assistantMode("production"), remote), remote);
  assert.equal(databaseConnectionString(assistantMode("production"), undefined), undefined);
  assert.throws(() => assistantMode("prod"), /NODE_ENV/);
});
