import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../src/config.js";

function tmpHome(withFile: unknown | null): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dualtran-cfg-"));
  if (withFile !== null) {
    fs.mkdirSync(path.join(dir, ".dualtran"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".dualtran", "config.json"), typeof withFile === "string" ? withFile : JSON.stringify(withFile));
  }
  return dir;
}

describe("loadConfig", () => {
  it("returns defaults when nothing is configured", () => {
    const config = loadConfig({}, tmpHome(null));
    expect(config.ai).toEqual({ provider: "openai", apiKey: "", baseURL: "", model: "" });
    expect(config.defaultTargetLang).toBe("en");
    expect(config.defaultEngine).toBe("google");
  });

  it("reads ~/.dualtran/config.json", () => {
    const config = loadConfig({}, tmpHome({ provider: "anthropic", apiKey: "k", model: "claude-x", targetLang: "fr", engine: "ai" }));
    expect(config.ai.provider).toBe("anthropic");
    expect(config.ai.apiKey).toBe("k");
    expect(config.ai.model).toBe("claude-x");
    expect(config.defaultTargetLang).toBe("fr");
    expect(config.defaultEngine).toBe("ai");
  });

  it("env variables override the file", () => {
    const home = tmpHome({ provider: "anthropic", apiKey: "file-key" });
    const config = loadConfig({ DUALTRAN_PROVIDER: "openai", DUALTRAN_API_KEY: "env-key" }, home);
    expect(config.ai.provider).toBe("openai");
    expect(config.ai.apiKey).toBe("env-key");
  });

  it("ignores a malformed config file and keeps the defaults", () => {
    const config = loadConfig({}, tmpHome("{ not json"));
    expect(config.ai.provider).toBe("openai");
    expect(config.ai.apiKey).toBe("");
  });
});
