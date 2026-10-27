// Gate: no "docworkbench" residue outside the allowlist.
// The theme identity is now Symblix end-to-end.
import { test, expect } from "@playwright/test";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = join(__dirname, "..");
const EXCLUDE_DIRS = new Set(["node_modules", "public", "test-results", ".git", "devdocs"]);
// Allowlist: only docs/migration-notes.md may contain historical "docworkbench" mentions
const ALLOWLIST = new Set(["docs/migration-notes.md", "tests/identity.spec.ts"]);

function walk(dir: string, hits: Array<{ path: string; line: number; content: string }>): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        walk(full, hits);
      }
      continue;
    }
    if (!entry.isFile()) continue;
    // Only search text files
    const ext = full.split(".").pop()?.toLowerCase();
    const textExts = new Set(["md", "toml", "json", "js", "ts", "css", "html", "yaml", "yml", "txt", "sh", "bash"]);
    if (ext && !textExts.has(ext)) continue;
    try {
      const content = readFileSync(full, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/docworkbench/i.test(lines[i])) {
          const rel = relative(REPO_ROOT, full);
          hits.push({ path: rel, line: i + 1, content: lines[i].trim() });
        }
      }
    } catch {
      // Skip binary/unreadable files
    }
  }
}

test("no docworkbench residue outside allowlist", () => {
  const hits: Array<{ path: string; line: number; content: string }> = [];
  walk(REPO_ROOT, hits);
  const violations = hits.filter((h) => !ALLOWLIST.has(h.path));
  if (violations.length > 0) {
    const details = violations.map((v) => `${v.path}:${v.line}: ${v.content}`).join("\n");
    throw new Error(`Found ${violations.length} "docworkbench" references outside allowlist:\n${details}`);
  }
  expect(violations.length).toBe(0);
});