import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";

test("i18n locales have identical key sets", () => {
  const files = readdirSync("i18n").filter((f) => f.endsWith(".yaml"));
  expect(files.length).toBeGreaterThanOrEqual(4);
  const keySets = files.map((f) =>
    new Set(Array.from(readFileSync(`i18n/${f}`, "utf8").matchAll(/- id: (\S+)/g)).map((m) => m[1]))
  );
  const [en, ...rest] = keySets.map((s) => Array.from(s).sort());
  rest.forEach((keys) => expect(keys).toEqual(en));
  ["latest_release", "changelog", "checksum", "suggested_for_system", "install", "download"].forEach((k) =>
    expect(en).toContain(k)
  );
});