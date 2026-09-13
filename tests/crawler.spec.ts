import { expect, test } from "@playwright/test";

const BASE = "http://127.0.0.1:1313";
const SAME_HOST = new Set(["127.0.0.1:1313", "localhost:1313"]);

test.setTimeout(120_000);

function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => {
    return new URL(match[1], BASE).pathname;
  });
}

async function mapInBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

test("every internal link on every sitemap page resolves", async ({ request }) => {
  test.info().annotations.push({ type: "note", description: "Crawls all languages" });

  const indexResponse = await request.get("/sitemap.xml");
  expect(indexResponse.ok()).toBeTruthy();

  const languageSitemaps = extractLocs(await indexResponse.text());
  expect(languageSitemaps.length).toBeGreaterThanOrEqual(4);

  const pagePaths = (
    await mapInBatches(languageSitemaps, 4, async (sitemapPath) => {
      const response = await request.get(sitemapPath);
      expect(response.ok(), `sitemap ${sitemapPath}`).toBeTruthy();
      return extractLocs(await response.text());
    })
  ).flat();
  expect(pagePaths.length).toBeGreaterThan(80);

  // Collect every same-origin href/src from every page.
  const linkSources = new Map<string, string>();
  await mapInBatches(pagePaths, 8, async (pagePath) => {
    const response = await request.get(pagePath);
    expect(response.ok(), `page ${pagePath}`).toBeTruthy();

    const html = await response.text();
    for (const match of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      const raw = match[1];
      if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript|data):/.test(raw)) {
        continue;
      }
      const url = new URL(raw, BASE + pagePath);
      if (!SAME_HOST.has(url.host)) {
        continue;
      }
      const target = url.pathname + url.search;
      if (!linkSources.has(target)) {
        linkSources.set(target, pagePath);
      }
    }
  });
  expect(linkSources.size).toBeGreaterThan(100);

  const broken: string[] = (
    await mapInBatches(Array.from(linkSources.entries()), 8, async ([link, source]) => {
      const response = await request.get(link);
      return response.ok() ? null : `${response.status()} ${link} (linked from ${source})`;
    })
  ).filter(Boolean) as string[];

  expect(broken, `${broken.length} broken internal link(s)`).toEqual([]);
});

test("every language publishes a valid search index", async ({ request }) => {
  const indexResponse = await request.get("/sitemap.xml");
  const languages = extractLocs(await indexResponse.text())
    .map((path) => path.split("/")[1])
    .filter(Boolean)
    .sort();

  for (const language of languages) {
    const response = await request.get(`/${language}/search-index.json`);
    expect(response.ok(), `/${language}/search-index.json`).toBeTruthy();

    const entries = await response.json();
    expect(Array.isArray(entries), language).toBeTruthy();
    expect(entries.length, language).toBeGreaterThan(3);
    for (const entry of entries) {
      expect(entry.url, language).toMatch(new RegExp(`^/${language}/`));
      expect(typeof entry.title).toBe("string");
      expect(["latest", "v1.0"], `${language}: ${entry.url}`).toContain(entry.version);
    }
  }
});
