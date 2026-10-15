/**
 * End-to-end over the real stdio entry: spawns dist/index.js through the
 * official StdioClientTransport, exercises tools/list + list_engines + a
 * deterministic error path (AI engine without a key — no network), and scans
 * the process stdout to prove the stdout purity rule (every line must be a
 * JSON-RPC message; logs belong on stderr).
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const ENTRY = path.resolve("dist/index.js");

describe("dualtran-mcp stdio entry", () => {
  it("serves tools/list, list_engines and a structured error through the real transport", async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: [ENTRY],
      env: { ...process.env, DUALTRAN_API_KEY: "" },
      stderr: "pipe",
    });
    const client = new Client({ name: "e2e", version: "0.0.0" });
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual(["list_engines", "translate_batch", "translate_text"]);

    const status = await client.callTool({ name: "list_engines", arguments: {} });
    expect((status.content as { text: string }[])[0].text).toContain("google");

    const err = await client.callTool({ name: "translate_text", arguments: { text: "x", engine: "ai" } });
    expect(err.isError).toBe(true);
    expect((err.content as { text: string }[])[0].text).toMatch(/no API key configured/i);

    await client.close();
  }, 30000);

  it("keeps stdout pure: every line the server writes is valid JSON", async () => {
    const child = spawn("node", [ENTRY], { env: { ...process.env, DUALTRAN_API_KEY: "" } });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));

    const write = (obj: Record<string, unknown>) => child.stdin.write(JSON.stringify(obj) + "\n");
    write({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2026-07-28", capabilities: {}, clientInfo: { name: "raw", version: "0.0.0" } },
    });
    write({ jsonrpc: "2.0", method: "notifications/initialized" });
    write({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

    await new Promise((resolve) => setTimeout(resolve, 4000));
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));

    const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    const ids = lines.map((line) => JSON.parse(line).id).filter((id) => id !== undefined);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  }, 30000);
});
