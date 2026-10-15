import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../src/engine.js";

function makeCore(overrides: Record<string, unknown> = {}) {
  return {
    translateGoogle: vi.fn(async ({ sourceArray }: { sourceArray: string[] }) => sourceArray.map((t) => `T:${t}`)),
    streamChat: vi.fn(async () => ({ totalChunks: 0, streamError: null })),
    buildTranslationMessages: vi.fn(() => ({ system: "SYS", assistant: "ACK" })),
    codeToLanguageNameInEnglish: vi.fn((c: string) => (c === "en" ? "English" : c)),
    formatAiError: vi.fn((e: { message?: string } | undefined) => ({ message: String((e && e.message) || e) })),
    ...overrides,
  };
}

const baseConfig = {
  ai: { provider: "openai", apiKey: "", baseURL: "", model: "" },
  defaultTargetLang: "en",
  defaultEngine: "google" as const,
};

describe("createEngine — google path", () => {
  it("batches through core.translateGoogle with the resolved options", async () => {
    const core = makeCore();
    const engine = createEngine({ core: core as never, config: baseConfig });
    const result = await engine.translateBatch([" Hello ", "", "World"], { targetLang: "fr", sourceLang: "en" });
    expect(result).toEqual({ translations: ["T:Hello", "T:World"], engine: "google", targetLang: "fr" });
    const arg = core.translateGoogle.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.sourceArray).toEqual(["Hello", "World"]);
    expect(arg.sourceLanguage).toBe("en");
    expect(arg.targetLanguage).toBe("fr");
  });

  it("falls back to the configured defaults", async () => {
    const core = makeCore();
    const engine = createEngine({ core: core as never, config: { ...baseConfig, defaultTargetLang: "ja" } });
    await engine.translateBatch(["x"]);
    const arg = core.translateGoogle.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.targetLanguage).toBe("ja");
    expect(arg.sourceLanguage).toBe("auto");
  });

  it("returns an empty result for blank input without calling the engine", async () => {
    const core = makeCore();
    const engine = createEngine({ core: core as never, config: baseConfig });
    expect(await engine.translateBatch(["", "   "])).toEqual({ translations: [], engine: "google", targetLang: "en" });
    expect(core.translateGoogle).not.toHaveBeenCalled();
  });
});

describe("createEngine — ai path", () => {
  const aiConfig = { ...baseConfig, ai: { provider: "openai", apiKey: "k", baseURL: "", model: "gpt-test" } };

  it("streams one chat per text with the extension-shaped messages", async () => {
    const core = makeCore({
      streamChat: vi.fn(async ({ onChunk }: { onChunk: (t: string) => void }) => {
        onChunk("Hola");
        return { totalChunks: 1, streamError: null };
      }),
    });
    const engine = createEngine({ core: core as never, config: aiConfig });
    const result = await engine.translateBatch(["Hello"], { engine: "ai" });
    expect(result.translations).toEqual(["Hola"]);
    const arg = (core.streamChat as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, never>;
    expect(arg.provider).toBe("openai");
    expect(arg.apiKey).toBe("k");
    expect((arg.messages as { role: string }[]).map((m) => m.role)).toEqual(["system", "user", "user"]);
  });

  it("throws a config error when no key is set", async () => {
    const engine = createEngine({ core: makeCore() as never, config: baseConfig });
    await expect(engine.translateBatch(["x"], { engine: "ai" })).rejects.toThrow(/no API key configured/i);
  });

  it("propagates formatted stream errors", async () => {
    const core = makeCore({
      streamChat: vi.fn(async () => ({ totalChunks: 0, streamError: { statusCode: 429 } })),
      formatAiError: vi.fn(() => ({ message: "Rate limit exceeded" })),
    });
    const engine = createEngine({ core: core as never, config: aiConfig });
    await expect(engine.translateBatch(["x"], { engine: "ai" })).rejects.toThrow("Rate limit exceeded");
  });
});

describe("createEngine — status", () => {
  it("reports the google engine and the AI configuration state without leaking the key", () => {
    const engine = createEngine({ core: makeCore() as never, config: { ...baseConfig, ai: { provider: "anthropic", apiKey: "secret", baseURL: "", model: "m" } } });
    const status = engine.status();
    expect(status.google.available).toBe(true);
    expect(status.ai.available).toBe(true);
    expect(status.ai.provider).toBe("anthropic");
    expect(JSON.stringify(status)).not.toContain("secret");
  });
});
