export const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/nextjs_dev";

/** Next.js sets its mode; the standalone assistant defaults to development. */
export function databaseConnectionString(mode: string | undefined, configuredUrl: string | undefined) {
  return mode === "development" ? LOCAL_DATABASE_URL : configuredUrl;
}

export function assistantMode(mode: string | undefined) {
  const value = mode ?? "development";
  if (!["development", "production", "test"].includes(value)) throw new Error("NODE_ENV must be development, production, or test");
  return value;
}
