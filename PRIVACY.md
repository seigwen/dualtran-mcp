# Privacy Policy — dualtran-mcp

dualtran-mcp is a local MCP server. It collects **nothing**: no analytics, no
telemetry, no accounts, and no developer server.

- Text you translate is sent to the service **you** selected: Google (default,
  free, no account) or, in AI mode, directly to your AI provider with your own
  API key.
- Configuration (including the API key, when set) lives on your machine — in
  environment variables you control or in `~/.dualtran/config.json`.
- No other network requests are made. The process writes logs to stderr only.

Bundled engine: `@dualtran/core` (MPL-2.0), extracted from
https://github.com/seigwen/DualTran-extension.

Contact: seigwen — seigwen@gmail.com — https://github.com/seigwen/DualTran-extension/issues
