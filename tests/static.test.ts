/**
 * Static guards: the stdout purity rule (stdio MCP servers must never
 * console.log — it corrupts the JSON-RPC framing), required files, and the
 * publish metadata basics.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

describe("stdout purity", () => {
  it("src never calls console.log (logs must go to stderr)", () => {
    const files = fs.readdirSync(path.join(ROOT, "src")).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = fs.readFileSync(path.join(ROOT, "src", file), "utf8");
      expect(source, `${file} must not console.log`).not.toMatch(/console\.log\s*\(/);
    }
  });
});

describe("publish metadata", () => {
  it("package.json carries the MCP registry name, a bin entry and a files allowlist", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.mcpName).toMatch(/^io\.github\..+\/.+$/);
    expect(pkg.bin["dualtran-mcp"]).toBe("dist/index.js");
    expect(pkg.files).toContain("dist");
    expect(pkg.engines.node).toBeDefined();
  });

  it("ships README, LICENSE and PRIVACY", () => {
    for (const file of ["README.md", "LICENSE", "PRIVACY.md"]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
    }
  });
});
