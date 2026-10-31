// SYM-MOT-002 S4 — asset-backed readiness proof.
//
// Two halves, both required by the contract:
//  1. Build time: data/scenes/<id>.yaml is validated, resolved, fingerprinted,
//     and emitted as an escaped same-origin JSON map; every invalid manifest
//     fails Hugo with page/parameter context and never renders a shell.
//  2. Runtime: the manifest is re-validated BEFORE any request; ctx.assets is
//     frozen; ctx.fetchAsset is allowlisted, abortable via the generation
//     signal, and rejects !ok responses; `ready` gates the first frame; the
//     shared 10 s deadline and rejection are terminal with exactly-once
//     cleanup; withholding an asset keeps the poster at opacity 1 with zero
//     scene callbacks.
//
// Oracles are real callbacks through real scene modules and real HTTP fetches
// (including a subpath deployment served from a temp destination), never
// monkey-patched runtime internals.
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import {
  cpSync, createReadStream, existsSync, mkdirSync, mkdtempSync,
  readFileSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, live, mount, probe, PROBE_MODULE } from "./helpers/scene-fixture";
import { ASSET_MOUNT, SCENES_PAGE } from "./helpers/motion";

const REPO_ROOT = join(__dirname, "..");
const MODEL = readFileSync(join(REPO_ROOT, "exampleSite", "assets", "models", "instrument.json"), "utf8");

/** Author-code readiness fixture: counters are written by the real
 *  frame/resize/palette/dispose callbacks and the real generation AbortSignal. */
const ASSET_MODULE = `
export default function createScene(ctx) {
  const p = window.__motionProbe[ctx.mount.id] ||= {
    creates:0, frames:0, disposes:0, cleanups:0, resizes:0, palettes:0,
    aborts:0, parts:-1, frozen:false, firstFrameResizes:-1,
  };
  p.creates++;
  p.frozen = Object.isFrozen(ctx.assets);
  ctx.onDispose(() => { p.cleanups++; });
  ctx.signal.addEventListener("abort", () => { p.aborts++; });
  const ready = ctx.assets.model ? ctx.fetchAsset("model").then((res) => res.json()).then((json) => {
    if (ctx.signal.aborted) return undefined;
    const model = new ctx.THREE.ObjectLoader().parse(json);
    p.parts = model.children.length;
    ctx.onDispose(() => {
      model.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
    });
    return undefined;
  }) : Promise.resolve();
  return {
    ready,
    frame() {
      p.frames++;
      if (p.firstFrameResizes < 0) p.firstFrameResizes = p.resizes;
    },
    onResize() { p.resizes++; },
    onPaletteChange() { p.palettes++; },
    dispose() { p.disposes++; },
  };
}
createScene.api = 1;
`;

/** Figure markup carrying a captured manifest pointing at the intercepted URL. */
function assetMount(id: string, manifestJson = `{"model":"/__motion_asset__${id}.json"}`, options = "") {
  return mount(id, `data-scene-assets='${manifestJson}' ${options}`);
}

function serveModel(page: Page, id: string, make: () => { status: number; body: string }) {
  return page.route(`**/__motion_asset__${id}.json`, (route) =>
    route.fulfill({ contentType: "application/json", ...make() }).catch(() => { /* retired */ }),
  );
}

const hostView = (page: Page, id: string) =>
  page.evaluate((sceneId) => {
    const host = [...window.SymblixMotion.hosts.values()].find((h) => h.id === sceneId);
    return host ? { state: host.state, stage: host.stage, errorCode: host.errorCode } : null;
  }, id);

test.describe("asset readiness runtime", () => {
  test("a withheld model keeps the poster opaque with zero scene callbacks", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const requested = page.waitForRequest("**/__motion_asset__held.json");
    await fixture(page, assetMount("held"), ASSET_MODULE, async () => {
      await page.route("**/__motion_asset__held.json", async (route) => {
        await held;
        await route.fulfill({ contentType: "application/json", body: MODEL }).catch(() => { /* retired */ });
      });
    });
    try {
      await requested;
      const stage = page.locator("#held");
      await expect.poll(() => hostView(page, "held")).toEqual({ state: "loading", stage: "ready", errorCode: null });
      expect(await probe(page, "held")).toMatchObject({ creates: 1, frames: 0, resizes: 0, palettes: 0, parts: -1, frozen: true });
      await expect(stage.locator(".docs-scene__poster")).toHaveCSS("opacity", "1");

      release();
      await live(page, "held");
      const done = await probe(page, "held");
      expect(done.parts).toBe(8); // six meshes + two lights, parsed by the vendored ObjectLoader
      // Q12: changes made while readiness was pending flush BEFORE the first frame.
      expect(done.firstFrameResizes).toBeGreaterThanOrEqual(1);
      await expect.poll(async () => (await probe(page, "held")).frames, { timeout: 2000 }).toBeGreaterThan(2);
    } finally { release(); }
  });

  test("asset HTTP failure is terminal, disposes once, and keeps the poster", async ({ page }) => {
    await fixture(page, assetMount("gone"), ASSET_MODULE, () =>
      serveModel(page, "gone", () => ({ status: 404, body: "missing" })));
    await expect(page.locator("#gone")).toHaveAttribute("data-scene-state", "error");
    expect((await hostView(page, "gone")).errorCode).toBe("scene-ready");
    // Every retirement aborts the generation; the settled fetch just never produced art.
    expect(await probe(page, "gone")).toMatchObject({ creates: 1, frames: 0, disposes: 1, cleanups: 1, aborts: 1, parts: -1 });
    await expect(page.locator("#gone canvas")).toHaveCount(0);
    await expect(page.locator("#gone .docs-scene__poster")).toHaveCSS("opacity", "1");
    // Terminal means terminal: an unrelated restore event cannot revive it.
    await page.evaluate(() => document.querySelector("#gone")?.dispatchEvent(new Event("webglcontextrestored")));
    expect((await probe(page, "gone")).frames).toBe(0);
  });

  test("invalid model JSON rejects readiness with exactly-once cleanup", async ({ page }) => {
    await fixture(page, assetMount("corrupt"), ASSET_MODULE, () =>
      serveModel(page, "corrupt", () => ({ status: 200, body: "{not json" })));
    await expect(page.locator("#corrupt")).toHaveAttribute("data-scene-state", "error");
    expect((await hostView(page, "corrupt")).errorCode).toBe("scene-ready");
    expect(await probe(page, "corrupt")).toMatchObject({ disposes: 1, cleanups: 1, frames: 0 });
    await expect(page.locator("#corrupt canvas")).toHaveCount(0);
  });

  test("an invalid ready shape is a create-time failure, not deferred failure", async ({ page }) => {
    const module = ASSET_MODULE.replace("ready,", "ready: 'soon',");
    await fixture(page, assetMount("shape"), module, () =>
      serveModel(page, "shape", () => ({ status: 200, body: MODEL })));
    await expect(page.locator("#shape")).toHaveAttribute("data-scene-state", "error");
    expect((await hostView(page, "shape")).errorCode).toBe("scene-create");
    expect(await probe(page, "shape")).toMatchObject({ cleanups: 1, frames: 0 });
    await expect(page.locator("#shape canvas")).toHaveCount(0);
  });

  test("fetchAsset rejects names outside the allowlist without touching the network", async ({ page }) => {
    const module = ASSET_MODULE.replace('ctx.fetchAsset("model")', 'ctx.fetchAsset("nope")');
    const urls: string[] = [];
    page.on("request", (req) => urls.push(req.url()));
    await fixture(page, assetMount("unknown"), module, () =>
      serveModel(page, "unknown", () => ({ status: 200, body: MODEL })));
    await expect(page.locator("#unknown")).toHaveAttribute("data-scene-state", "error");
    expect((await hostView(page, "unknown")).errorCode).toBe("scene-ready");
    expect(urls.filter((u) => /__motion_asset__/.test(u))).toEqual([]);
    expect(await probe(page, "unknown")).toMatchObject({ disposes: 1, cleanups: 1, frames: 0 });
  });

  test("destroying while the asset is in flight aborts the fetch and prevents late frames", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const requested = page.waitForRequest("**/__motion_asset__mid.json");
    await fixture(page, `<div class="row">${assetMount("mid")}${mount("sibling")}</div>`, ASSET_MODULE, async () => {
      await page.route("**/__motion_asset__mid.json", async (route) => {
        await held;
        await route.fulfill({ contentType: "application/json", body: MODEL }).catch(() => { /* aborted */ });
      });
    });
    try {
      await requested;
      await expect.poll(() => hostView(page, "mid")).toMatchObject({ state: "loading", stage: "ready" });
      await page.evaluate(() => {
        const el = document.querySelector("#mid");
        window.SymblixMotion.destroyHost(el);
        window.SymblixMotion.destroyHost(el); // twice: no additional observable effect
      });
      await expect(page.locator("#mid")).toHaveAttribute("data-scene-state", "disposed");
      expect(await probe(page, "mid")).toMatchObject({ aborts: 1, disposes: 1, cleanups: 1, frames: 0 });
      release();
      await page.waitForTimeout(250);
      expect(await probe(page, "mid")).toMatchObject({ frames: 0, parts: -1 });
      await expect(page.locator("#mid canvas")).toHaveCount(0);
      // The sibling keeps running — one teardown never poisons the page.
      await live(page, "sibling");
    } finally { release(); }
  });

  test("the 10-second readiness deadline is terminal for a never-responding asset", async ({ page }, testInfo) => {
    testInfo.setTimeout(20_000);
    const never = new Promise<void>(() => { /* no route ever answers */ });
    await fixture(page, assetMount("slow"), ASSET_MODULE, async () => {
      await page.route("**/__motion_asset__slow.json", async (route) => {
        await never;
        await route.fulfill({ contentType: "application/json", body: MODEL }).catch(() => { /* dead */ });
      });
    });
    await expect(page.locator("#slow")).toHaveAttribute("data-scene-state", "error", { timeout: 15_000 });
    expect((await hostView(page, "slow")).errorCode).toBe("scene-timeout");
    expect(await probe(page, "slow")).toMatchObject({ aborts: 1, disposes: 1, cleanups: 1, frames: 0 });
    await expect(page.locator("#slow .docs-scene__poster")).toHaveCSS("opacity", "1");
  });

  test("hand-edited hostile manifests fail before a single request", async ({ page }) => {
    const urls: string[] = [];
    page.on("request", (req) => urls.push(req.url()));
    let traps = 0;
    await fixture(page, `<div>${[
      assetMount("broken", `{no json here}`),
      assetMount("name", `{"Model":"/__motion_asset__name.json"}`),
      assetMount("scheme", `{"model":"https://asset-trap.invalid/m.json"}`),
      assetMount("relative", `{"model":"//asset-trap.invalid/m.json"}`),
      assetMount("traversal", `{"model":"/../secret.json"}`),
      assetMount("query", `{"model":"/m.json?v=1"}`),
      assetMount("array", `[1,2]`),
      assetMount("many", `{${Array.from({ length: 65 }, (_, i) => `"a${i}":"/m.json"`).join(",")}}`),
      assetMount("healthy"),
    ].join("")}</div>`, ASSET_MODULE, () => {
      void page.route("https://asset-trap.invalid/**", async (route) => { traps++; await route.fulfill({ body: "" }); });
      return serveModel(page, "healthy", () => ({ status: 200, body: MODEL }));
    });
    // Each mount must be scrolled into view: admission (and therefore the
    // manifest check) is intentionally deferred until real intent.
    for (const id of ["broken", "name", "scheme", "relative", "traversal", "query", "array", "many"]) {
      await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
      await expect(page.locator(`#${id}`)).toHaveAttribute("data-scene-state", "error", { timeout: 3000 });
      expect((await hostView(page, id)).errorCode, id).toBe("scene-assets");
    }
    expect(traps).toBe(0);
    // No module import and no asset request for any rejected manifest.
    for (const id of ["broken", "name", "scheme", "relative", "traversal", "query", "array", "many"]) {
      expect(urls.some((u) => u.includes(`__motion_probe__${id}`)), id).toBe(false);
      expect(urls.some((u) => u.includes(`__motion_asset__${id}`)), id).toBe(false);
    }
    // Only the healthy mount's traffic happened; it still runs.
    await live(page, "healthy");
    expect((await probe(page, "healthy")).parts).toBe(8);
  });

  test("a synchronous API-1 scene with an emitted manifest keeps working (FR-17)", async ({ page }) => {
    await fixture(page, assetMount("plain"), PROBE_MODULE);
    await live(page, "plain");
    expect((await probe(page, "plain")).frames).toBeGreaterThan(0);
  });
});

test.describe("asset manifest build contract", () => {
  interface Site { code: number; stderr: string; dir: string; html?: string }

  function buildAssetSite(opts: {
    yaml?: Record<string, unknown> | string;
    sceneId?: string;
    baseURL?: string;
  } = {}): Site {
    const dir = mkdtempSync(join(tmpdir(), "scene-assets-"));
    for (const sub of ["content", "data/scenes", "assets/js/scenes", "assets/models", "assets/images"]) {
      mkdirSync(join(dir, sub), { recursive: true });
    }
    writeFileSync(join(dir, "hugo.toml"), [
      'title = "scene-assets"',
      `baseURL = ${JSON.stringify(opts.baseURL ?? "http://localhost/")}`,
      'theme = "hugo-theme-symblix"',
      `themesDir = ${JSON.stringify(join(REPO_ROOT, "exampleSite", "themes"))}`,
      'defaultContentLanguage = "en"',
      'disableKinds = ["taxonomy", "term", "RSS", "sitemap"]',
      "",
    ].join("\n"));
    const manifestId = opts.sceneId ?? "instrument";
    if (opts.yaml !== undefined) {
      const body = typeof opts.yaml === "string"
        ? opts.yaml
        : Object.entries(opts.yaml).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n") + "\n";
      writeFileSync(join(dir, "data", "scenes", `${manifestId}.yaml`), body);
    }
    cpSync(join(REPO_ROOT, "exampleSite", "assets", "models", "instrument.json"), join(dir, "assets", "models", "instrument.json"));
    cpSync(join(REPO_ROOT, "exampleSite", "assets", "js", "scenes", "__asset.js"), join(dir, "assets", "js", "scenes", "__asset.js"));
    cpSync(join(REPO_ROOT, "exampleSite", "assets", "images", "scene-asset-poster.svg"), join(dir, "assets", "images", "scene-asset-poster.svg"));
    writeFileSync(join(dir, "content", "note.md"), [
      "+++", 'title = "Note"', "+++", "",
      `{{< scene src="js/scenes/__asset.js" poster="images/scene-asset-poster.svg" title="Instrument" assets="${manifestId}" >}}Static specification copy.{{< /scene >}}`,
      "",
    ].join("\n"));
    let code = 0;
    let stderr = "";
    try {
      execFileSync("hugo", ["--source", dir, "--destination", join(dir, "public")], {
        encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error: any) {
      code = error.status ?? 1;
      stderr = `${error.stdout || ""}\n${error.stderr || ""}`;
    }
    let html: string | undefined;
    try {
      html = readFileSync(join(dir, "public", "note", "index.html"), "utf8");
    } catch { /* failed builds render nothing */ }
    return { code, stderr, dir, html };
  }

  function cleanup(site: Site) { rmSync(site.dir, { recursive: true, force: true }); }

  test("the emitted map is escaped JSON with fingerprinted same-origin paths", () => {
    const site = buildAssetSite({ yaml: { model: "models/instrument.json" } });
    try {
      expect(site.code, site.stderr).toBe(0);
      const raw = site.html!.match(/data-scene-assets="([^"]*)"/)?.[1];
      expect(raw, "manifest attribute emitted").toBeTruthy();
      expect(raw).toContain("&#34;"); // HTML-escaped: never a raw quote in the attribute
      const decoded = JSON.parse(raw!.replace(/&#34;/g, '"'));
      expect(Object.keys(decoded)).toEqual(["model"]);
      expect(decoded.model).toMatch(/^\/models\/instrument\.[a-f0-9]{64}\.json$/);
      const onDisk = join(site.dir, "public", decoded.model.replace(/^\//, ""));
      expect(existsSync(onDisk), `fingerprinted asset exists: ${decoded.model}`).toBe(true);
      expect(readFileSync(onDisk, "utf8")).toBe(MODEL); // bytes retained unchanged
      expect(site.html).toMatch(/data-scene-src="\/js\/scenes\/__asset\.min\.[a-f0-9]+\.js"/);
    } finally { cleanup(site); }
  });

  test("without the assets param no manifest attribute is emitted", () => {
    const dir = mkdtempSync(join(tmpdir(), "scene-nomanifest-"));
    try {
      mkdirSync(join(dir, "content"), { recursive: true });
      mkdirSync(join(dir, "assets", "js", "scenes"), { recursive: true });
      mkdirSync(join(dir, "assets", "images"), { recursive: true });
      writeFileSync(join(dir, "hugo.toml"), [
        'title = "nomanifest"', 'baseURL = "http://localhost/"', 'theme = "hugo-theme-symblix"',
        `themesDir = ${JSON.stringify(join(REPO_ROOT, "exampleSite", "themes"))}`,
        'defaultContentLanguage = "en"', 'disableKinds = ["taxonomy", "term", "RSS", "sitemap"]', "",
      ].join("\n"));
      cpSync(join(REPO_ROOT, "exampleSite", "assets", "js", "scenes", "orbit.js"), join(dir, "assets", "js", "scenes", "orbit.js"));
      cpSync(join(REPO_ROOT, "exampleSite", "assets", "images", "scene-orbit-poster.svg"), join(dir, "assets", "images", "scene-orbit-poster.svg"));
      writeFileSync(join(dir, "content", "note.md"),
        '+++\ntitle = "Note"\n+++\n\n{{< scene src="js/scenes/orbit.js" poster="images/scene-orbit-poster.svg" title="T" >}}Copy.{{< /scene >}}\n');
      execFileSync("hugo", ["--source", dir, "--destination", join(dir, "public")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const html = readFileSync(join(dir, "public", "note", "index.html"), "utf8");
      expect(html).toContain("data-scene-src");
      expect(html).not.toContain("data-scene-assets");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  const invalidManifests: Array<[string, Record<string, unknown>, RegExp]> = [
    ["uppercase name", { Model: "models/instrument.json" }, /name "Model" must match/],
    ["scheme path", { model: "https://cdn.example.com/m.json" }, /not a URL/],
    ["protocol-relative path", { model: "//cdn.example.com/m.json" }, /not a URL/],
    ["query string", { model: "models/instrument.json?v=2" }, /query or fragment/],
    ["fragment", { model: "models/instrument.json#frag" }, /query or fragment/],
    ["traversal segment", { model: "models/../private/m.json" }, /must not contain/],
    ["missing asset", { model: "models/nope.json" }, /not found in assets/],
    ["nested value", { model: { path: "models/instrument.json" } }, /asset path string/],
  ];
  for (const [name, value, message] of invalidManifests) {
    test(`build fails on ${name} with page context`, () => {
      const site = buildAssetSite({ yaml: value });
      try {
        expect(site.code, `expected failure for ${name}`).not.toBe(0);
        expect(site.stderr).toMatch(/ERROR (scene|reveal-text)/);
        expect(site.stderr).toMatch(message);
        expect(site.stderr).not.toMatch(/no Resource provided/); // no secondary nil-resource crash
        expect(site.stderr).toMatch(/note\.md|Note/); // identifies the page
      } finally { cleanup(site); }
    });
  }

  test("an invalid manifest id fails the shortcode validation", () => {
    const site = buildAssetSite({ sceneId: "BAD-ID", yaml: { model: "models/instrument.json" } });
    try {
      // The id is invalid → shortcode error; the data file named BAD-ID.yaml
      // was also written, so the manifest lookup must never be attempted.
      expect(site.code).not.toBe(0);
      expect(site.stderr).toMatch(/assets "BAD-ID" must be a manifest id/);
    } finally { cleanup(site); }
  });

  test("a missing manifest file fails the build naming the manifest", () => {
    const site = buildAssetSite({ sceneId: "absent" }); // no yaml written at all
    try {
      expect(site.code).not.toBe(0);
      expect(site.stderr).toMatch(/manifest "absent" not found in data\/scenes\/absent\.yaml/);
    } finally { cleanup(site); }
  });

  test("65-entry manifest fails; 64 entries build", () => {
    const big = Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`m${i}`, "models/instrument.json"]));
    const fail = buildAssetSite({ yaml: big });
    try { expect(fail.stderr).toMatch(/at most 64/); } finally { cleanup(fail); }
    const ok = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`m${i}`, "models/instrument.json"]));
    const pass = buildAssetSite({ yaml: ok });
    try { expect(pass.code, pass.stderr).toBe(0); } finally { cleanup(pass); }
  });

  test("subpath hosting: /project/ prefixes every motion URL and each resolves over HTTP", async ({ page }) => {
    const site = buildAssetSite({ yaml: { model: "models/instrument.json" }, baseURL: "/project/" });
    let server!: ReturnType<typeof createServer>;
    try {
      const built = site.html!;
      const src = built.match(/data-scene-src="([^"]+)"/)![1];
      const assets = JSON.parse(built.match(/data-scene-assets="([^"]+)"/)![1].replace(/&#34;/g, '"'));
      expect(src.startsWith("/project/js/scenes/__asset.min.")).toBe(true);
      expect(assets.model.startsWith("/project/models/instrument.")).toBe(true);

      // Serve the temp destination. Hugo writes files without the baseURL
      // path segment; the deployment maps /project/… onto them.
      const root = join(site.dir, "public");
      server = createServer((req, res) => {
        let path = decodeURIComponent(new URL(req.url!, "http://127.0.0.1").pathname);
        if (path.startsWith("/project")) path = path.slice("/project".length) || "/";
        if (path.endsWith("/")) path += "index.html";
        const file = join(root, path);
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
          res.writeHead(404); res.end("missing"); return;
        }
        const type = file.endsWith(".html") ? "text/html" : file.endsWith(".js") ? "text/javascript"
          : file.endsWith(".json") ? "application/json" : file.endsWith(".css") ? "text/css"
          : file.endsWith(".svg") ? "image/svg+xml" : file.endsWith(".woff2") ? "font/woff2" : "application/octet-stream";
        res.writeHead(200, { "content-type": type });
        createReadStream(file).pipe(res);
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const port = (server.address() as { port: number }).port;

      const paths: string[] = [];
      const broken: string[] = [];
      page.on("request", (req) => paths.push(new URL(req.url()).pathname));
      page.on("response", (res) => {
        const path = new URL(res.url()).pathname;
        if (res.status() >= 400 && /\/(js|models|css)\//.test(path)) broken.push(`${res.status()} ${path}`);
      });

      await page.goto(`http://127.0.0.1:${port}/project/note/`, { timeout: 30_000 });
      expect(paths.some((p) => p.startsWith("/project/js/motion-loader.min."))).toBe(true);
      expect(paths.some((p) => p === "/models/instrument.json" || p.startsWith("/models/instrument."))).toBe(false);
      await page.locator("[data-scene]").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
      await expect
        .poll(() => page.locator("[data-scene]").getAttribute("data-scene-state"), { timeout: 15_000 })
        .toBe("live");
      expect(await page.locator("canvas").count()).toBe(1);
      expect(paths.filter((p) => p.startsWith("/project/models/instrument."))).toHaveLength(1);
      expect(broken, `broken motion references: ${broken.join(", ")}`).toEqual([]);
    } finally {
      if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
      cleanup(site);
    }
  });
});

test.describe("shipped documentation mount", () => {
  test("scenes.md carries a real asset mount that becomes live through the fetched model", async ({ page }, testInfo) => {
    test.setTimeout(20_000);
    const requests: string[] = [];
    const offOrigin: string[] = [];
    const origin = new URL(test.info().project.use.baseURL || "http://127.0.0.1:1314").origin;
    page.on("request", (req) => {
      requests.push(req.url());
      if (new URL(req.url()).origin !== origin) offOrigin.push(req.url());
    });
    await page.goto(SCENES_PAGE);
    const mount = page.locator(ASSET_MOUNT);
    await expect(mount).toHaveAttribute("data-scene-load", "visible");
    const assets = await mount.evaluate((el) => JSON.parse(el.getAttribute("data-scene-assets") || "{}"));
    expect(assets.model).toMatch(/^\/models\/instrument\.[a-f0-9]{64}\.json$/);

    await mount.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect
      .poll(() => mount.getAttribute("data-scene-state"), { timeout: 5_000 })
      .toBe("live");
    expect(requests.filter((u) => /\/models\/instrument\.[a-f0-9]+\.json$/.test(u))).toHaveLength(1);
    expect(await mount.locator("canvas").count()).toBe(1);
    await expect(mount.locator(".docs-scene__poster")).toHaveCSS("opacity", "0");
    expect(offOrigin).toEqual([]);
    // Visual review evidence for the rendered instrument (human-inspected,
    // not asserted upon).
    const path = testInfo.outputPath("asset-instrument-live.png");
    await mount.screenshot({ path });
    await testInfo.attach("asset-instrument-live", { path, contentType: "image/png" });
    // The orbit tutorial beside it registers cleanly (its own visible path
    // is covered by the lifecycle/runtime suites; here it never entered the
    // viewport, so idle-without-error is the honest expectation).
    expect(await hostView(page, "scene-0")).toMatchObject({ state: "idle", errorCode: null });
  });

  test("reduced motion fetches neither the runtime nor any manifest asset", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto(SCENES_PAGE);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1200); // the idle window in which admission would fire
    expect(requests.filter((u) => /motion\.min|models\/instrument/.test(u))).toEqual([]);
    await expect(page.locator(ASSET_MOUNT)).toHaveAttribute("data-scene-state", "idle");
  });
});
