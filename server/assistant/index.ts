import "dotenv/config";
import { createAssistantService } from "./service";
import { createOllamaGenerator } from "./ollama";
import { createAssistantAnalytics } from "./analytics";
import { assistantMode, databaseConnectionString } from "../../lib/db/connection";

const port = Number(process.env.ASSISTANT_PORT ?? "3001");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("ASSISTANT_PORT must be an integer between 1 and 65535");
}
const mode = assistantMode(process.env.NODE_ENV);
const database = createAssistantAnalytics(databaseConnectionString(mode, process.env.DATABASE_URL));
const service = createAssistantService({
  role: process.env.APP_ROLE,
  generate: createOllamaGenerator({ baseURL: process.env.OLLAMA_BASE_URL, model: process.env.OLLAMA_MODEL, analytics: database.analytics }),
  allowedOrigins: (process.env.ASSISTANT_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",").map((origin) => origin.trim()).filter(Boolean),
});

service.server.on("error", (error) => {
  console.error("Assistant service failed:", error.message);
  void service.close().then(() => database.close()).finally(() => { process.exitCode = 1; });
});
service.server.listen(port, process.env.ASSISTANT_HOST ?? "127.0.0.1", () => {
  console.info(`Assistant WebSocket service listening on port ${port} (${mode}; database: ${mode === "development" ? "local Postgres" : "DATABASE_URL"})`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void service.close().then(() => database.close()).catch((error: unknown) => {
      console.error("Assistant shutdown failed:", error);
      process.exitCode = 1;
    });
  });
}
