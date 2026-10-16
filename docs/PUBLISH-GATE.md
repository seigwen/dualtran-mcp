# Publish gate — dualtran-mcp (plan 64 D6)

Everything below the "prepared" line is a **user action** (npm account,
registry login). The code side is complete and verified offline.

## Prepared (done in this repository)

- [x] `npm test` green: tsc build + 21 vitest cases (in-memory server, real
      stdio subprocess e2e, stdout purity scan, static guards).
- [x] `npm pack` dry-run verified (dist + docs only).
- [x] `mcpName` in package.json == `server.json` name
      (`io.github.seigwen/dualtran-mcp`).
- [x] README with Claude Code / Cursor / Cline snippets + `npx github:` usage.

## User actions (in order — plan 64 D6: core first)

1. **Core published (2026-10-16).** `dualtran@1.0.0` is live on npm and this
   package consumes it via `"dualtran": "^1.0.0"`; the former
   `file:vendor/dualtran-core.tgz` vendoring is retired.
2. Publish this package:
   ```bash
   npm login                 # your account
   npm publish --access public   # unscoped name: dualtran-mcp (free)
   ```
   Verify: https://www.npmjs.com/package/dualtran-mcp
3. Publish to the official MCP Registry:
   ```bash
   mcp-publisher login github   # your GitHub account (seigwen)
   mcp-publisher publish        # uses server.json in this repo
   ```
   Verify with `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=dualtran"`.
4. Directory submissions (form-based, optional but recommended per D8):
   Smithery (smithery.ai), mcp.so, Glama, cursor.directory — paste the npm
   name + repo URL + the README description.

## After npm publish (repo hygiene)

- Update the README `npx -y dualtran-mcp` mention (already written) — no
  change needed once the name resolves.
- Tag the repo `v0.1.0` when the GitHub remote exists.
