import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { buildServer } from "../src/server.js";

function makeCore(overrides: Record<string, unknown> = {}) {
  return {
    translateGoogle: vi.fn(async ({ sourceArray }: { sourceArray: string[] }) => sourceArray.map((t) => `T:${t}`)),
    streamChat: vi.fn(async () => ({ totalChunks: 0, streamError: null })),
    buildTranslationMessages: vi.fn(() => ({ system: "SYS", assistant: "ACK" })),
    codeToLanguageNameInEnglish: vi.fn((c: string) => c),
    formatAiError: vi.fn((e: { message?: string } | undefined) => ({ message: String((e && e.message) || e) })),
    ...overrides,
  };
}

const config = {
  ai: { provider: "openai", apiKey: "", baseURL: "", model: "" },
  defaultTargetLang: "en",
  defaultEngine: "google" as const,
};

let client: Client | undefined;

afterEach(async () => {
  await client?.close().catch(() => {});
  client = undefined;
});

async function connect(core: ReturnType<typeof makeCore>) {
  const server = buildServer({ core: core as never, config });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return { server, client };
}

describe("dualtran MCP server over InMemoryTransport", () => {
  it("lists the three tools", async () => {
    const { client: c } = await connect(makeCore());
    const tools = await c.listTools();
    const names = tools.tools.map((t) => t.name).sort();
    expect(names).toEqual(["list_engines", "translate_batch", "translate_text"]);
  });

  it("translate_text returns the translation and structured content", async () => {
    const core = makeCore();
    const { client: c } = await connect(core);
    const res = await c.callTool({ name: "translate_text", arguments: { text: "Hello", target_lang: "fr" } });
    expect(res.isError).toBeFalsy();
    const content = res.content as { type: string; text: string }[];
    expect(content[0].text).toBe("T:Hello");
    expect(res.structuredContent).toMatchObject({ translation: "T:Hello", engine: "google", targetLanguage: "fr" });
  });

  it("translate_batch returns an ordered array", async () => {
    const { client: c } = await connect(makeCore());
    const res = await c.callTool({ name: "translate_batch", arguments: { texts: ["One", "Two"], target_lang: "de" } });
    expect(res.structuredContent).toMatchObject({ translations: ["T:One", "T:Two"], engine: "google", targetLanguage: "de" });
  });

  it("list_engines reports availability without the API key", async () => {
    const core = makeCore();
    const { client: c } = await connect(core);
    const res = await c.callTool({ name: "list_engines", arguments: {} });
    const text = (res.content as { text: string }[])[0].text;
    expect(text).toContain("google");
    expect(text).toContain("openai");
  });

  it("surfaces engine failures as structured tool errors (isError)", async () => {
    const core = makeCore({
      translateGoogle: vi.fn(async () => {
        throw new Error("Google translation failed: HTTP 429");
      }),
    });
    const { client: c } = await connect(core);
    const res = await c.callTool({ name: "translate_text", arguments: { text: "Hello" } });
    expect(res.isError).toBe(true);
    expect((res.content as { text: string }[])[0].text).toContain("Google translation failed: HTTP 429");
  });
});
