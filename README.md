# dualtran-mcp

An MCP (Model Context Protocol) server that translates text with **Google** or
**your own AI model** (BYOK, 20+ providers) — usable from Claude Code, Claude
Desktop, Cursor, Cline, VS Code and any other MCP client. Powered by
`@dualtran/core`, the engine extracted from the
[DualTran browser extension](https://github.com/seigwen/DualTran-extension).

## Tools

| Tool | What it does |
|---|---|
| `translate_text` | Translate one piece of text. Optional `target_lang`, `source_lang`, `engine` (`google` \| `ai`). |
| `translate_batch` | Translate up to 50 texts in one call (one batched Google request). |
| `list_engines` | Report available engines and the AI configuration state (never the key). |

## Install

```bash
npx -y dualtran-mcp            # once published to npm
# or straight from this repository (works today, no registry needed):
npx -y github:seigwen/dualtran-mcp
```

## Configure

Google works out of the box — no key, no account.

For the AI engine (optional), configure a provider once — either with
environment variables:

```
DUALTRAN_PROVIDER=openai        # openai | anthropic | google | deepseek | mistral | groq | xai | …
DUALTRAN_API_KEY=sk-…
DUALTRAN_MODEL=gpt-4o-mini
DUALTRAN_BASE_URL=              # optional endpoint override
DUALTRAN_TARGET_LANG=en         # default target language
DUALTRAN_ENGINE=google          # default engine: google | ai
```

or with `~/.dualtran/config.json`:

```json
{ "provider": "openai", "apiKey": "sk-…", "model": "gpt-4o-mini", "targetLang": "en", "engine": "ai" }
```

Environment variables win over the file.

## Client configuration

**Claude Code** (`.mcp.json` in the project, or `claude mcp add`):

```json
{
  "mcpServers": {
    "dualtran": {
      "command": "npx",
      "args": ["-y", "github:seigwen/dualtran-mcp"],
      "env": { "DUALTRAN_TARGET_LANG": "en" }
    }
  }
}
```

**Cursor** (`~/.cursor/mcp.json`) and **Cline / other clients**: same shape —
`command: npx`, `args: ["-y", "github:seigwen/dualtran-mcp"]`, optional env.

## Privacy

No analytics, no accounts, no developer server. Text goes only to the
translation service you chose, at the moment you translate. See PRIVACY.md.

## Development

```bash
node scripts/sync-core.mjs   # vendors @dualtran/core into vendor/ (committed)
npm install
npm test                     # tsc build + vitest (in-memory server, real stdio e2e, stdout purity scan)
```

## License

MIT — the bundled `@dualtran/core` portion is MPL-2.0.
