/**
 * The MCP server surface: three tools (translate_text, translate_batch,
 * list_engines) registered on the v2 McpServer. Errors are mapped to
 * structured tool errors (isError) — never thrown across the protocol.
 */
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createEngine, CoreLike } from "./engine.js";
import type { ServerConfig } from "./config.js";

export const SERVER_NAME = "dualtran-mcp";
export const SERVER_VERSION = "0.1.0";

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

export function buildServer({
  core,
  config,
  fetchImpl = null,
}: {
  core: CoreLike;
  config: ServerConfig;
  fetchImpl?: unknown;
}): McpServer {
  const engine = createEngine({ core, config, fetchImpl });
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  const commonArgs = {
    target_lang: z.string().optional().describe("Target language code (e.g. en, zh-CN, ja). Defaults to the server config."),
    source_lang: z.string().optional().describe('Source language code, or "auto" to detect. Defaults to auto.'),
    engine: z.enum(["google", "ai"]).optional().describe("Translation engine override: google (free) or ai (BYOK)."),
  };

  server.registerTool(
    "translate_text",
    {
      title: "Translate Text",
      description: "Translate one piece of text with Google or the configured AI provider (BYOK).",
      inputSchema: z.object({
        text: z.string().min(1).describe("The text to translate."),
        ...commonArgs,
      }),
    },
    async (args) => {
      try {
        const result = await engine.translateBatch([args.text], {
          targetLang: args.target_lang,
          sourceLang: args.source_lang,
          engine: args.engine,
        });
        const translation = result.translations[0] ?? "";
        return {
          content: [{ type: "text" as const, text: translation }],
          structuredContent: {
            translation,
            engine: result.engine,
            targetLanguage: result.targetLang,
          },
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "translate_batch",
    {
      title: "Translate Batch",
      description: "Translate up to 50 texts in one call (one batched Google request, or one AI call per text).",
      inputSchema: z.object({
        texts: z.array(z.string().min(1)).min(1).max(50).describe("The texts to translate, in order."),
        ...commonArgs,
      }),
    },
    async (args) => {
      try {
        const result = await engine.translateBatch(args.texts, {
          targetLang: args.target_lang,
          sourceLang: args.source_lang,
          engine: args.engine,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result.translations) }],
          structuredContent: {
            translations: result.translations,
            engine: result.engine,
            targetLanguage: result.targetLang,
          },
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "list_engines",
    {
      title: "List Engines",
      description: "Report which translation engines are available and how the AI engine is configured (never the key itself).",
      inputSchema: z.object({}),
    },
    async () => {
      const status = engine.status();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }],
        structuredContent: status as unknown as Record<string, unknown>,
      };
    }
  );

  return server;
}
