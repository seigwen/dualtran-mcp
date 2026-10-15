#!/usr/bin/env node
/**
 * dualtran-mcp — stdio entry.
 *
 * Stdout purity rule: this process must write NOTHING but JSON-RPC to stdout
 * (a stray log line corrupts the protocol framing). All logging goes to
 * console.error (stderr). tests/static.test.ts enforces the rule.
 */
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as core from "dualtran";
import { loadConfig } from "./config.js";
import { buildServer } from "./server.js";

const config = loadConfig();

const handle = serveStdio(() => buildServer({ core: core as never, config }));

const shutdown = async () => {
  await handle.close().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.error(`[dualtran-mcp] serving stdio (default engine: ${config.defaultEngine}, default target: ${config.defaultTargetLang})`);
