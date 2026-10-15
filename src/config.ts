/**
 * Configuration for the DualTran MCP server.
 *
 * Sources, in increasing priority:
 *   1. built-in defaults
 *   2. ~/.dualtran/config.json  { "provider", "apiKey", "baseURL", "model",
 *      "targetLang", "engine" }  (flat JSON; malformed files are ignored)
 *   3. environment variables: DUALTRAN_PROVIDER / DUALTRAN_API_KEY /
 *      DUALTRAN_BASE_URL / DUALTRAN_MODEL / DUALTRAN_TARGET_LANG /
 *      DUALTRAN_ENGINE
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AiSettings {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface ServerConfig {
  ai: AiSettings;
  defaultTargetLang: string;
  defaultEngine: "google" | "ai";
}

interface FileConfig {
  provider?: unknown;
  apiKey?: unknown;
  baseURL?: unknown;
  model?: unknown;
  targetLang?: unknown;
  engine?: unknown;
}

function readConfigFile(homeDir: string): FileConfig {
  const file = path.join(homeDir, ".dualtran", "config.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as FileConfig) : {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[dualtran-mcp] ignoring unusable ${file}: ${(error as Error).message}`);
    }
    return {};
  }
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
  homeDir: string = os.homedir()
): ServerConfig {
  const file = readConfigFile(homeDir);
  const engine = env.DUALTRAN_ENGINE ?? file.engine;
  return {
    ai: {
      provider: str(env.DUALTRAN_PROVIDER ?? file.provider, "openai"),
      apiKey: str(env.DUALTRAN_API_KEY ?? file.apiKey, ""),
      baseURL: str(env.DUALTRAN_BASE_URL ?? file.baseURL, ""),
      model: str(env.DUALTRAN_MODEL ?? file.model, ""),
    },
    defaultTargetLang: str(env.DUALTRAN_TARGET_LANG ?? file.targetLang, "en"),
    defaultEngine: engine === "ai" ? "ai" : "google",
  };
}
