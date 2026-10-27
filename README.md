# hugo-theme-symblix

A Hugo documentation theme for structured, navigable, versioned, multilingual technical documentation. Documentation versions track releases of the matching software project.

## Highlights

- **No-JavaScript baseline:** reading, navigation, the table of contents, the version/language switchers, tabs, and search fallback all work with JavaScript disabled. JavaScript only adds enhancements (instant search, code copy buttons, saved theme preference, sidebar filtering).
- **Search:** each language publishes a `search-index.json`; the search page runs instant in-browser search over it (version/type/topic filters), and falls back to a server-rendered page catalog plus the browse index without JavaScript.
- **Syntax highlighting:** server-side Chroma highlighting with a theme-aware token palette — no client-side highlighter.
- **Mermaid diagrams:** fenced `mermaid` blocks are rendered to static SVG at build time (light + dark variants, cached by content hash) by `npm run diagrams`; unrendered blocks fall back to a plain code block. No client-side Mermaid library, no external requests.
- **Preset color system:** seven swappable color themes (light/dark modes) with bundled fonts, adaptive callouts, and automatic syntax highlighting switching.
- **Bundled fonts:** self-hosted Inter (body) and JetBrains Mono (code) variable fonts with `font-display: swap` — zero external requests.
- **Versioning:** current + archived docs trees, a version switcher with page-equivalent resolution, `noindex` and sitemap exclusion for archived releases.
- **Multilingual:** per-language content trees, translation status warnings, and a language switcher that falls back gracefully when a page is untranslated.
- **Pre-built CSS:** ships compiled CSS so sites need only Hugo. Tailwind CSS v4 is an optional development dependency for styling from source.
- **Project front page:** `release`, `install`, and `downloads` shortcodes compose a software landing page — release badge, copyable install commands, and binary downloads — complete without JavaScript. Platform detection annotates the right download row as a JavaScript enhancement only. Two developer-selected chrome layouts: the header bar, or a Material-style icon rail — on narrow screens both collapse into a dropdown menu built on a no-JS `<details>` element.
- **Bento blocks:** `feature-grid` renders equal text tiles, media tiles (image or themed glyph bands), or an asymmetric 1+2 lead band; `video` embeds self-hosted clips natively and YouTube through a click-to-load facade — no third-party request until the visitor presses play.
- **Project chrome:** default SVG favicon (drop in your own to override), an expanded multi-column footer driven by Hugo menus (brand column, social icons, translated column titles), license line, and copyright — configured entirely from `hugo.toml`.

## Requirements

- Hugo (extended) — the template floor is 0.158; the optional Tailwind source build needs 0.161+.
- A top-level docs section (`content/<lang>/docs/…` by default, configurable via `params.docs.root`). Versioning features additionally read `data/docs_versions.yaml`; see the [Versioning](#example-site) docs page in the example site for the full model.
- With `defaultContentLanguageInSubdir = true`, Hugo renders the themed 404 per language (`/en/404.html`, …). Hosts that serve a single root 404 (GitHub Pages) should point their 404 setting at the default language's `404.html`.

## Development

The example site doubles as the theme documentation and links to itself through the symlink `exampleSite/themes/hugo-theme-symblix → ../..`. On Windows, enable symlink support before cloning (`git config --global core.symlinks true`, or run Git with developer mode); if the symlink was checked out as a plain file, recreate it manually.

```bash
npm install        # only needed for Tailwind source builds, diagrams, and tests
npm run dev        # example site, CSS compiled from Tailwind source (watches)
npm run dev:prebuilt
npm run diagrams   # pre-render ```mermaid blocks to assets/diagrams (cached)
npm run build      # production build using the committed pre-built CSS
npm run check      # build with --panicOnWarning (CI mode)
npm test           # Playwright suite (needs `npm run test:install` once)
npm run build:css  # regenerate assets/css/compiled/theme.css after CSS edits
```

A plain `hugo` build works without npm: the theme loads `assets/css/compiled/theme.css` by default. Building from the Tailwind source layers instead requires the Tailwind CLI allowed in Hugo's security policy (see the example site's `hugo.toml`).

## Authoring

The theme includes archetypes for common documentation page types.

Create a new page with one of the archetypes:

```bash
hugo new --source exampleSite --theme hugo-theme-symblix content/en/docs/latest/my-page.md
hugo new --source exampleSite --theme hugo-theme-symblix --kind how-to content/en/docs/latest/user-guide/my-task.md
hugo new --source exampleSite --theme hugo-theme-symblix --kind tutorial content/en/docs/latest/tutorials/my-tutorial.md
hugo new --source exampleSite --theme hugo-theme-symblix --kind home content/en/_index.md
```

Available archetypes: `default`, `home`, `tutorial`, `how-to`, `reference`, `explanation`, `migration`, `release-note`. The archetypes do not force any folder structure — use them wherever they fit your documentation tree. The `home` archetype scaffolds a project front page with the release, install, and downloads shortcodes.

## Example Site

Start with these pages:

- [Getting Started](/en/docs/latest/getting-started/)
- [Configuration](/en/docs/latest/configuration/)
- [Navigation](/en/docs/latest/navigation/)
- [Versioning](/en/docs/latest/versioning/)
- [Multilingual](/en/docs/latest/multilingual/)
- [Search](/en/docs/latest/search/)
- [Components](/en/docs/latest/components/)
- [Diagrams](/en/docs/latest/components/diagrams/)
- [Video](/en/docs/latest/components/video/)
- [Customization](/en/docs/latest/customization/)
- [Presets System](/en/docs/latest/components/presets/)

## Presets (Visual Identity)

Symblix includes a comprehensive visual identity system with seven built-in **color presets**, bundled typography, and adaptive callout colors.

### Color Presets

Choose from seven complete color themes that define base colors, callout colors, and badge colors:

- `symblix-light` (light, blue accent)
- `symblix-dark` (dark, blue accent)
- `ocean-dark` (dark, cyan-teal accent)
- `forest-light` (light, green accent)
- `sunset-dark` (dark, amber accent)
- `solarized-light` (light, classic Solarized)
- `high-contrast` (light, WCAG AAA compliant)

Configure in `hugo.toml`:

```toml
[params.docs.theme]
preset = "symblix-light"
availablePresets = ["symblix-light", "symblix-dark", "ocean-dark"]
```

### Bundled Typography

The theme bundles Inter (body text) and JetBrains Mono (code) as WOFF2 variable fonts under the SIL Open Font License 1.1. Both are self-hosted with `font-display: swap` and system fallbacks.

### Adaptive Features

- **Callout colors** adapt to each preset's accent color
- **Syntax highlighting** automatically switches between light/dark palettes based on preset mode
- **Mermaid diagrams** render light/dark variants matching the active preset

Users switch presets via dropdowns in the sidebar footer (docs pages) and header (landing pages). Selections persist in `localStorage`. Visitors who have not picked a preset — including no-JS readers — get the OS color scheme: a pure-CSS `prefers-color-scheme: dark` fallback maps the light default to its dark tokens.

### Dual Switcher Locations

- Sidebar footer: Full preset list with swatches and descriptions
- Front-page header: Compact icon button with dropdown panel

Both stay in sync and are hidden without JavaScript (falling back to the configured default).

## Mermaid diagrams

Fenced `mermaid` blocks render as static SVG at build time — the published pages carry no Mermaid JavaScript and make no external requests.

1. `npm run diagrams` scans content for `mermaid` blocks, renders each with `mermaid-cli` (installed as a dev dependency; override the binary with `MMDC_BIN`), and writes `assets/diagrams/<sha256>.svg` plus a dark-theme `<sha256>.dark.svg`. Rendering is cached by the content hash, so only new or changed diagrams cost build time.
2. The render hook serves those SVGs as `<img>` elements; the dark variant swaps with the theme switcher via CSS alone.
3. A block with no pre-rendered diagram falls back to a plain code block, so drafting never breaks a build. Set `[params.docs.mermaid] enforce = true` to warn instead (and fail `--panicOnWarning` builds) until the pipeline runs.

`npm run build`, `npm run check`, and `npm test` run the pipeline automatically. Site repositories adopt the same pattern: run `node <theme>/scripts/render-diagrams.mjs --content content --out assets/diagrams` before `hugo`.

## Front-page chrome

The front page supports two developer-selected layouts (set `params.docs.frontPage.chrome`; not user-switchable):

- `"topbar"` (default) — the header bar: logo left; navigation from the `header` Hugo menu and social SVG icons top right.
- `"rail"` — a vertical icon rail (Material-style): logo mark, one icon+label button per `header` menu entry, social icons, and the preset switcher at the bottom. Icons come from each entry's `params.icon` (shipped glyph names in `docs/helpers/icon-svg.html`; unknown names fall back to a styled initial).

```toml
[params.docs.frontPage]
chrome = "rail"   # "topbar" (default) or "rail"

[[languages.en.menus.header]]
name = "Docs"
pageRef = "/docs/latest/"
weight = 10
icon = "book-open"   # rail glyph; see icon-svg.html for shipped names

[[params.docs.social]]
name = "GitHub"
url = "https://github.com/you/project"
icon = "github"   # optional; falls back to the lowercased name
```

Shipped social icons: `github`, `x`, `bluesky`, `youtube`, `rss`; any other name renders a globe glyph. Override `layouts/partials/docs/helpers/social-icon.html` to add more brands and `icon-svg.html` for generic glyphs.

On screens under 48rem both layouts collapse into a dropdown menu on a `<details>` element — links, social icons, and the theme switcher, all functional without JavaScript; the script bundle only adds close-on-outside-click and Escape.

## Video

The `video` shortcode embeds videos that play inside the page:

```go
{{</* video src="/videos/demo.webm" poster="/videos/demo.jpg"
           title="Product tour" caption="Optional *markdown* caption."
           duration="2:41" */>}}

{{</* video youtube="VIDEO_ID" title="Launch talk" duration="10:34" */>}}
```

Self-hosted sources render a native `<video controls preload="metadata">` — embedded playback with no JavaScript and no external requests. YouTube sources render a static facade (your `poster`, or a themed placeholder) and load the privacy-enhanced nocookie player only after the visitor presses play; without JavaScript the facade is a plain outbound link. `title` is required and becomes the accessible name.

## Footer

The footer has two tiers. The meta tier (copyright, license, powered-by) always renders; the link tier appears when configured and contains a brand column (wordmark, description, social icons) plus one column per entry in `params.docs.footer.columns`, each rendering a Hugo menu — defined per language so links and titles translate:

```toml
[params.docs.footer]
description = "Versioned, multilingual documentation without JavaScript."

[[params.docs.footer.columns]]
title = "Product"
menu = "footer"

[[languages.fr.menus.footer]]
name = "Accueil"
pageRef = "/"
weight = 10
```

Omit `description` and `columns` to keep the original slim footer.

## Non-Goals

The theme intentionally omits the following. They are not bugs; they are design boundaries.

1. **No client-side dependency additions.** No search library, no font loader, no framework. Bundle budget stays ~12 KB minified JS.
2. **No fuzzy/typo-tolerant search.** The hand-rolled exact-token matcher stays. Revisit only with evidence.
3. **No "edit on GitHub", analytics bundling, or feedback widgets.** The `custom-head.html` hook is the sanctioned extension point; the theme ships none of them.
4. **Self-hosted fonts only.** The theme bundles Inter and JetBrains Mono fonts locally. Font configuration accepts stack declarations with bundled fonts as the first choice, followed by system fallbacks.
5. **No PDF / whole-version export.** Recorded as a possible future feature, not a commitment.
6. **No JS-required navigation of any kind.** ⌘K-style palettes are excluded by the no-JS contract.
7. **No whole-system refactor of parked areas.** Sidebar collapse/scroll-spy, per-version index splitting, and `render-image` improvements are out of blast radius and recorded as follow-ons.

## Revisit Triggers

- Search index > 2 MB raw per language → per-version index splitting.
- Nav tree "uncomfortably tall" in real use → collapse/filter work.
- PDF/whole-version export → possible future feature, no commitment.

## Privacy

The theme makes **zero external runtime requests**. No fonts, scripts, analytics, or tracking are loaded from third parties. All assets (CSS, JS, favicon, search index) are served from the same origin. The optional `custom-head.html` hook is the single sanctioned extension point for site owners who wish to add third-party resources.

The one opt-in exception is the `video` shortcode's YouTube facade: page load stays third-party-free, and the nocookie player is fetched only after the visitor clicks play (self-hosted `src` videos never touch a third party).

## Content Security Policy

The theme emits exactly two inline bootstrap scripts (both wrapped in try/catch, parse-time only):

1. Theme preference restore in `head.html` (existing).
2. Sidebar pre-paint opener in `scripts.html` (D-09).

Everything else is deferred via `main.js`. Strict-CSP sites must hash-allowlist the two snippets (hashes change when edited — documented as a maintenance note) or relax to `'unsafe-inline'` for bootstrap only.


