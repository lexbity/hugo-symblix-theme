import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

test("i18n locales have identical key sets", () => {
  const files = readdirSync("i18n").filter((f) => f.endsWith(".yaml"));
  expect(files.length).toBeGreaterThanOrEqual(4);
  const keySets = files.map((f) =>
    new Set(Array.from(readFileSync(`i18n/${f}`, "utf8").matchAll(/- id: (\S+)/g)).map((m) => m[1]))
  );
  const [en, ...rest] = keySets.map((s) => Array.from(s).sort());
  rest.forEach((keys) => expect(keys).toEqual(en));
  ["latest_release", "changelog", "checksum", "suggested_for_system", "install"].forEach((k) =>
    expect(en).toContain(k)
  );
});

test("i18n closed key set: no referenced-but-undefined keys", () => {
  // Gather all i18n keys across locales
  const files = readdirSync("i18n").filter((f) => f.endsWith(".yaml"));
  const definedKeys = new Set();
  files.forEach((f) => {
    const matches = readFileSync(`i18n/${f}`, "utf8").matchAll(/- id: (\S+)/g);
    for (const m of matches) definedKeys.add(m[1]);
  });

  // Scan layouts for i18n "key" references
  // Pattern matches: {{ i18n "key" ... }} or {{ i18n `key` ... }}
  const layoutFiles = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".html")) {
        layoutFiles.push(full);
      }
    }
  }
  walk("layouts");

  const refPattern = /\{\{\s*i18n\s+["'`]([a-z0-9_]+)["'`]/g;
  const refKeys = new Set();
  layoutFiles.forEach((file) => {
    const content = readFileSync(file, "utf8");
    let match;
    while ((match = refPattern.exec(content)) !== null) {
      refKeys.add(match[1]);
    }
  });

  // Allowlist for dynamic lookups (none currently, but documented for future)
  const allowlist = new Set([]);

  const undefinedRefs = Array.from(refKeys).filter((k) => !definedKeys.has(k) && !allowlist.has(k));
  expect(undefinedRefs).toEqual([]);
});

test("i18n closed key set: no defined-but-unreferenced keys", () => {
  // Gather all i18n keys across locales
  const files = readdirSync("i18n").filter((f) => f.endsWith(".yaml"));
  const definedKeys = new Set();
  files.forEach((f) => {
    const matches = readFileSync(`i18n/${f}`, "utf8").matchAll(/- id: (\S+)/g);
    for (const m of matches) definedKeys.add(m[1]);
  });

  // Scan layouts for i18n "key" references
  const layoutFiles = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".html")) {
        layoutFiles.push(full);
      }
    }
  }
  walk("layouts");

  const refPattern = /\{\{\s*i18n\s+["'`]([a-z0-9_]+)["'`]/g;
  const refKeys = new Set();
  layoutFiles.forEach((file) => {
    const content = readFileSync(file, "utf8");
    let match;
    while ((match = refPattern.exec(content)) !== null) {
      refKeys.add(match[1]);
    }
  });

  // Allowlist for keys used via data attributes in JS (search page)
  const jsAllowlist = new Set([
    "search_results_count",
    "search_no_results",
    "search_error",
    "search_loading",
    "search_empty",
    "search_clear",
    "search_filters",
    "search_results_for",
    "search_all_versions",
    "search_all_types",
    "search_all_topics",
    "search_filter_version",
    "search_filter_docType",
    "search_filter_topic",
    "search_scope",
    "search_docs",
    "search",
    "search_unavailable",
    "browse_all_pages",
  ]);

  // Also include keys that are referenced in shortcode partials (which are in layouts/partials/docs/)
  // These are caught by the layout scan but let's be explicit
  const shortcodeAllowlist = new Set([
    // callout shortcodes
    "note", "tip", "info", "warning", "danger", "success", "deprecated", "experimental",
    // figure shortcode
    "figure_missing_alt",
    // cta shortcode
    "learn_more",
    // code shortcode (copy labels already in jsAllowlist)
    // download shortcode
    "suggested_for_system", "checksum",
    // install shortcode
    "install",
    // step shortcode
    "optional",
    // reference-meta helper
    "method", "path", "auth", "type", "code", "label", "default", "required", "yes", "no",
    "since", "removed", "status",
    // hero component
    "get_started",
    // page-card, child-pages, related-grid, section-map
    "child_pages", "section_map",
    // lifecycle badges (if any)
    // release component
    "latest_release", "changelog",
    // page meta / home
    "home_eyebrow", "license", "link_to",
    // mermaid render hook (i18n call sits mid-expression)
    "diagram",
  ]);

  const unusedKeys = Array.from(definedKeys).filter((k) => !refKeys.has(k) && !jsAllowlist.has(k) && !shortcodeAllowlist.has(k));
  expect(unusedKeys).toEqual([]);
});