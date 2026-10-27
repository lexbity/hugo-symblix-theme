// Gate: the committed pre-built stylesheet must be a current regeneration of the
// Tailwind source layers. A stale assets/css/compiled/theme.css ships unstyled
// features to every downstream site (delivery contract: hugo alone builds).
import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("compiled theme.css matches a fresh Tailwind build of the source layers", () => {
  test.setTimeout(60_000);
  const outDir = mkdtempSync(join(tmpdir(), "symblix-css-"));
  const outFile = join(outDir, "theme.css");
  execSync(
    "npx --no-install @tailwindcss/cli -i assets/css/input.css --minify -o " + outFile,
    { stdio: "pipe" },
  );
  const fresh = readFileSync(outFile, "utf8");
  const committed = readFileSync("assets/css/compiled/theme.css", "utf8");
  expect(committed).toBe(fresh);
});
