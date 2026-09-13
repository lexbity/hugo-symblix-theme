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

{{< note title="Static discovery first" >}}
The browse pages are part of the documentation, not a fallback afterthought. Search enhances them; it does not replace them.
{{< /note >}}
