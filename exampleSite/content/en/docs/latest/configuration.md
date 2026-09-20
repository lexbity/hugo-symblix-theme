+++
title = "Configuration"
nav = { title = "Configure" }
description = "Configure the theme, the content tree, and the example site from scratch."
since = "v1.2"
experimental = true
tags = ["configuration"]
related = ["/en/docs/latest/getting-started/", "/en/docs/latest/navigation/"]
date = 2026-05-01
weight = 20
+++

Configuration is where the theme becomes your site rather than the example site.

## Minimal Hugo config

This is the smallest useful shape for a Symblix-style site:

```toml
baseURL = "https://example.com/"
title = "My Docs"
theme = "hugo-theme-symblix"
defaultContentLanguage = "en"
defaultContentLanguageInSubdir = true

[languages.en]
contentDir = "content/en"

[taxonomies]
tag = "tags"

[params.docs]
root = "docs"
rightToc = true

[outputs]
home = ["HTML", "RSS", "SearchIndex"]

[params.docs.nav]
mode = "manual"
data = "docs_nav"
```

The `[languages]` block matters even for a single language: without `contentDir = "content/en"`, Hugo treats `content/` as the content root and pages under `content/en/` publish to doubled paths like `/en/en/docs/…`, which breaks manual-navigation lookups.

The `root` parameter is the name of the top-level docs section under each language's content directory (`docs` in the example site, but any folder name works). Set `[outputs] home` so the theme publishes the per-language `search-index.json` used by the search page.

## Content tree

The example site expects a straightforward tree of Markdown pages:

```txt
content/
  en/
    docs/
      latest/
        _index.md
        getting-started.md
        configuration.md
        navigation.md
```

The example site adds more pages, but the core idea stays the same: use folders and `_index.md` for navigation groups, use front matter `weight` for ordering, and let Hugo build the tree.

## Optional parameters

| Parameter | Default | Purpose |
| --- | --- | --- |
| `params.docs.root` | `docs` | Section name of the documentation tree. |
| `params.docs.rightToc` | `true` | Show the "On this page" table of contents. |
| `params.docs.favicon` | theme's `favicon.svg` | Set to any path to override the shipped icon. |
| `params.docs.versions.noindexArchived` | `false` | Adds `noindex` to archived versions, drops them from the sitemap, and excludes them from the search index. |
| `params.docs.components.reference.headingLevel` | `3` | Heading level used by reference shortcodes. |
| `params.docs.theme.preset` | `minimal` | Visual preset: `minimal`, `rounded`, or `high-contrast`. |
| `params.docs.theme.density` | `comfortable` | Spacing density for callouts and code blocks: `comfortable`, `compact`, or `dense`. |
| `params.features.themeSwitcher` | off unless set | Renders the light/dark/system preference control. |
| `params.seo.openGraph` / `params.seo.twitterCards` | off unless set | Emit OG and Twitter card meta tags. |
| `params.images` / page `images` | — | Image URLs used for `og:image` / `twitter:image`. |

## CSS customization

The theme ships pre-built CSS at `assets/css/compiled/theme.css`, so a site works with `hugo` alone — no Node.js, npm, or security-policy changes required. The compiled stylesheet is regenerated from the Tailwind source layers with `npm run build:css` whenever you customize them.

If you build styles from source (see [Customization](/en/docs/latest/customization/)), allow the Tailwind CLI in Hugo's security policy:

```toml
[security.exec]
allow = ['^(dart-)?sass$', '^go$', '^git$', '^node$', '^postcss$', '^tailwindcss$']
```
