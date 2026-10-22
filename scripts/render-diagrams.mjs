#!/usr/bin/env node
// Diagram pipeline: pre-render ```mermaid fenced blocks to SVG at build time.
//
// The theme's mermaid render hook serves assets/diagrams/<sha256>.svg (light)
// and <sha256>.dark.svg (dark). The hash is sha256 of the block source with
// CRLF normalized and whitespace trimmed — exactly what the hook hashes — so
// content changes produce new files and unchanged content stays cached.
//
// Usage: node scripts/render-diagrams.mjs --content <dir> [--content <dir> ...]
//        --out <dir> [--force]
// The mermaid CLI binary is resolved from $MMDC_BIN, the local
// node_modules/.bin/mmdc, then $PATH. `npm install` provides it via
// @mermaid-js/mermaid-cli.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = { content: [], out: "", force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--content") args.content.push(resolve(argv[++i]));
    else if (arg === "--out") args.out = resolve(argv[++i]);
    else if (arg === "--force") args.force = true;
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (args.content.length === 0 || !args.out) {
    console.error("Usage: render-diagrams.mjs --content <dir> [--content <dir> ...] --out <dir> [--force]");
    process.exit(2);
  }
  return args;
}

function* markdownFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* markdownFiles(path);
    else if (entry.isFile() && entry.name.endsWith(".md")) yield path;
  }
}

function extractMermaidBlocks(markdown) {
  const blocks = [];
  const fence = /(?:^|\n)([ \t]*)(`{3,}|~{3,})[ \t]*mermaid[^\n]*\n([\s\S]*?)\n?[ \t]*\2[ \t]*(?=\n|$)/g;
  let match;
  while ((match = fence.exec(markdown)) !== null) {
    // CRLF normalization and trimming must mirror the render hook exactly.
    const src = match[3].replace(/\r\n/g, "\n").trim();
    if (src) blocks.push(src);
  }
  return blocks;
}

function resolveMmdc() {
  if (process.env.MMDC_BIN) return process.env.MMDC_BIN;
  const local = join(themeRoot, "node_modules", ".bin", "mmdc");
  if (existsSync(local)) return local;
  return "mmdc";
}

function render(mmdc, workDir, src, outFile, theme) {
  const input = join(workDir, "diagram.mmd");
  const puppeteerConfig = join(workDir, "puppeteer.json");
  writeFileSync(input, `${src}\n`);
  writeFileSync(puppeteerConfig, JSON.stringify({ args: ["--no-sandbox"] }));
  execFileSync(
    mmdc,
    ["-i", input, "-o", outFile, "-t", theme, "-b", "transparent", "-p", puppeteerConfig, "--quiet"],
    { stdio: "pipe", cwd: workDir },
  );
}

const args = parseArgs(process.argv.slice(2));
const sources = new Map();
let files = 0;
for (const root of args.content) {
  if (!existsSync(root)) {
    console.error(`Content directory not found: ${root}`);
    process.exit(2);
  }
  for (const path of markdownFiles(root)) {
    files++;
    for (const src of extractMermaidBlocks(readFileSync(path, "utf8"))) {
      const hash = createHash("sha256").update(src).digest("hex");
      sources.set(hash, src);
    }
  }
}

if (sources.size === 0) {
  console.log(`No mermaid blocks in ${files} markdown file(s); nothing to render.`);
  process.exit(0);
}

mkdirSync(args.out, { recursive: true });
const mmdc = resolveMmdc();
const workDir = mkdtempSync(join(tmpdir(), "symblix-diagrams-"));
const variants = [
  { suffix: "", theme: "default" },
  { suffix: ".dark", theme: "dark" },
];

let rendered = 0;
let cached = 0;
let failed = 0;
for (const [hash, src] of sources) {
  const outputs = variants.map((v) => join(args.out, `${hash}${v.suffix}.svg`));
  if (!args.force && outputs.every(existsSync)) {
    cached++;
    continue;
  }
  try {
    for (const [i, v] of variants.entries()) {
      render(mmdc, workDir, src, outputs[i], v.theme);
    }
    rendered++;
    console.log(`Rendered diagram ${hash.slice(0, 12)}… (${src.split("\n").length} lines)`);
  } catch (error) {
    failed++;
    console.error(`Failed to render diagram ${hash.slice(0, 12)}…:\n${error.message}`);
  }
}

rmSync(workDir, { recursive: true, force: true });
console.log(`Diagrams: ${rendered} rendered, ${cached} cached, ${failed} failed → ${args.out}`);
if (failed > 0) process.exit(1);
