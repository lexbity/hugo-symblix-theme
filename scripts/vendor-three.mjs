#!/usr/bin/env node
// SYM-MOT-001: vendor three.js into the theme — pinned, hash-verified.
//
// Usage:
//   node scripts/vendor-three.mjs            download, verify, install
//   node scripts/vendor-three.mjs --verify   verify installed files only
//
// Reads scripts/vendor-three.manifest.json (version + sha256 per file),
// downloads that exact version from the npm registry, verifies every hash,
// and writes the artifacts into assets/js/vendor/three/. A hash mismatch is
// a hard failure: the manifest is the contract of record for what this theme
// bundles (NFR-11).
//
// The downloaded tarball is treated as untrusted data: it is extracted into
// a fresh temp directory and only ever read/copied — never executed here.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = join(ROOT, "scripts", "vendor-three.manifest.json");
const OUT_DIR = join(ROOT, "assets", "js", "vendor", "three");

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const fileNames = Object.keys(manifest.files);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function verifyBuffer(name, buffer) {
  const want = manifest.files[name].sha256;
  const got = sha256(buffer);
  if (got !== want) {
    console.error(`vendor-three: hash mismatch for ${name}\n  expected ${want}\n  got      ${got}`);
    process.exit(1);
  }
}

if (process.argv.includes("--verify")) {
  for (const name of fileNames) {
    const path = join(OUT_DIR, name);
    if (!existsSync(path)) {
      console.error(`vendor-three: missing ${path}`);
      process.exit(1);
    }
    verifyBuffer(name, readFileSync(path));
  }
  console.log(
    `vendor-three: verified ${manifest.version} (${fileNames.length} files, ${manifest.license})`,
  );
  process.exit(0);
}

console.log(`vendor-three: fetching ${manifest.source}`);
const workDir = mkdtempSync(join(tmpdir(), "vendor-three-"));
try {
  const packed = execFileSync(
    "npm",
    ["pack", manifest.source, "--pack-destination", workDir],
    { encoding: "utf8", cwd: workDir },
  )
    .trim()
    .split("\n")
    .pop()
    .trim();
  execFileSync("tar", ["-xzf", join(workDir, packed), "-C", workDir]);
  const pkgDir = join(workDir, "package");
  mkdirSync(OUT_DIR, { recursive: true });
  for (const name of fileNames) {
    const buffer = readFileSync(join(pkgDir, manifest.files[name].path));
    verifyBuffer(name, buffer);
    writeFileSync(join(OUT_DIR, name), buffer);
    console.log(`vendor-three: wrote ${name} (${buffer.length} bytes, sha256 ok)`);
  }
  console.log(`vendor-three: installed ${manifest.version} → assets/js/vendor/three/`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
