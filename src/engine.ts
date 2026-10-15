/**
 * The translation engine behind the MCP tools — the same contract as the
 * workbench hosts: Google as one batched core.translateGoogle call, AI as one
 * streaming chat per text via core.streamChat, both fully dependency-injected
 * so tests run against a stub core with no network.
 */
import type { ServerConfig } from "./config.js";

export type EngineName = "google" | "ai";

export interface TranslateOptions {
  targetLang?: string;
  sourceLang?: string;
  engine?: EngineName;
}

export interface TranslateResult {
  translations: string[];
  engine: EngineName;
  targetLang: string;
}

export interface EngineStatus {
  google: { available: true; note: string };
  ai: { available: boolean; provider: string; model: string; baseUrlOverride: boolean };
  defaultEngine: EngineName;
  defaultTargetLang: string;
}

export interface CoreLike {
  translateGoogle(args: {
    sourceArray: string[];
    sourceLanguage: string;
    targetLanguage: string;
    cache: unknown;
    fetchImpl: unknown;
  }): Promise<string[]>;
  streamChat(args: {
    provider: string;
    apiKey: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    extra?: Record<string, unknown>;
    store?: unknown;
    onChunk?: (text: string) => void;
  }): Promise<{ totalChunks: number; streamError: unknown }>;
  buildTranslationMessages(args: { content: string; targetLanguageName: string }): {
    system: string;
    assistant: string;
  };
  codeToLanguageNameInEnglish?(code: string): string;
  formatAiError(error: unknown): { message: string };
}

export function createEngine({
  core,
  config,
  fetchImpl = null,
}: {
  core: CoreLike;
  config: ServerConfig;
  fetchImpl?: unknown;
}) {
  async function translateAi(texts: string[], targetLang: string): Promise<string[]> {
    const { provider, apiKey, model, baseURL } = config.ai;
    if (!apiKey) {
      throw new Error(
        "AI engine selected but no API key configured — set DUALTRAN_API_KEY or write ~/.dualtran/config.json."
      );
    }
    const results: string[] = [];
    for (const content of texts) {
      const targetLanguageName =
        (core.codeToLanguageNameInEnglish && core.codeToLanguageNameInEnglish(targetLang)) || targetLang;
      const prompt = core.buildTranslationMessages({ content, targetLanguageName });
      // Message shape mirrors the extension's fetchSSE assembly.
      const messages = [
        { role: "system", content: prompt.system },
        { role: "user", content: "I understand. Please give me the text." },
        { role: "user", content },
      ];
      let text = "";
      const { totalChunks, streamError } = await core.streamChat({
        provider,
        apiKey,
        model,
        messages,
        extra: baseURL ? { baseURL } : {},
        store: null,
        onChunk: (chunk) => {
          text += chunk;
        },
      });
      if (streamError) {
        throw new Error(core.formatAiError(streamError).message);
      }
      if (totalChunks === 0) {
        throw new Error("No response from AI provider");
      }
      results.push(text);
    }
    return results;
  }

  return {
    /** Translate a batch of texts. Blank input returns an empty batch untouched. */
    async translateBatch(texts: string[], options: TranslateOptions = {}): Promise<TranslateResult> {
      const engineName: EngineName = options.engine ?? config.defaultEngine;
      const targetLang = options.targetLang ?? config.defaultTargetLang;
      const sourceLang = options.sourceLang ?? "auto";
      const filtered = texts.map((text) => text.trim()).filter((text) => text.length > 0);
      if (filtered.length === 0) {
        return { translations: [], engine: engineName, targetLang };
      }
      if (engineName === "ai") {
        return { translations: await translateAi(filtered, targetLang), engine: engineName, targetLang };
      }
      const translations = await core.translateGoogle({
        sourceArray: filtered,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        cache: null,
        fetchImpl,
      });
      return { translations, engine: engineName, targetLang };
    },

    /** Availability report for the list_engines tool — never exposes the key. */
    status(): EngineStatus {
      return {
        google: { available: true, note: "Free, no account required." },
        ai: {
          available: config.ai.apiKey.length > 0,
          provider: config.ai.provider,
          model: config.ai.model,
          baseUrlOverride: config.ai.baseURL.length > 0,
        },
        defaultEngine: config.defaultEngine,
        defaultTargetLang: config.defaultTargetLang,
      };
    },
  };
}
