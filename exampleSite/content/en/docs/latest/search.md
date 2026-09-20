+++
title = "Search"
description = "Interactive search with a static, JavaScript-free fallback."
layout = "search"
related = ["/en/docs/latest/navigation/", "/en/docs/latest/all-pages/"]
weight = 60
+++

The docs ship an interactive search page backed by a per-language JSON index, plus a static fallback that works without JavaScript.

## How search works

- **With JavaScript**, typing searches the full documentation index for the current language. Results are scoped to the current version by default, with version, type, and topic filters.
- **Without JavaScript**, the interactive index is unavailable. The complete page list for the current version is rendered below the search box — use your browser's find-in-page, or open the browse index.

Each language publishes its own `search-index.json` at the language root, so the payload stays small and the default scope is "current language + current version".

## What the index contains

To keep the payload lean, the index stores prose, not markup:

- **Code blocks are stripped** before indexing. Highlighted source dominates page weight but rarely improves ranking; titles, descriptions, and prose carry the match.
- **Archived versions are excluded** when `versions.noindexArchived = true` — the same policy that keeps them out of the sitemap applies to on-site search, so results never promote pages the site tells crawlers to forget.
- **Hidden pages** (nav entries with `hidden = true`) are excluded.
- Results show a **context snippet** around the first query match, with the matched text highlighted.

The filter bar is hidden until the index loads, so readers without JavaScript never see empty selects — they get the server-rendered catalog instead.

{{< note title="Scale guidance" >}}
The whole index is fetched on first use and searched in the browser. As a rule of thumb it stays comfortable up to a few hundred pages; if the generated `search-index.json` grows past roughly a megabyte per language, tighten what pages carry (or split reference material into its own section with `nav.hidden` pages kept out of search).
{{< /note >}}

{{< note title="Static discovery first" >}}
The browse pages are part of the documentation, not a fallback afterthought. Search enhances them; it does not replace them.
{{< /note >}}
