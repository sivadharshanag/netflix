import { existsSync } from "node:fs";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

async function main(): Promise<void> {
  const config = await loadConfig();
  const app = await buildApp(config);

  if (config.env !== "test" && !existsSync("dist/client")) {
    console.log("[server] dist/client not found — run `npm run build` for production, or `npm run dev:client` alongside this server for development.");
  }

  app.listen(config.port, () => {
    console.log(`[server] Listening on http://localhost:${config.port} (${config.env})`);
  });
}

main().catch((error) => {
  console.error("[server] Failed to start:", error);
  process.exitCode = 1;
});
