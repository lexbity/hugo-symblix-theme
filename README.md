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
- **Project front page:** `release`, `install`, and `downloads` shortcodes compose a software landing page — release badge, copyable install commands, and binary downloads — complete without JavaScript. Platform detection annotates the right download row as a JavaScript enhancement only. A front-page header puts site links and social icons in the top right; on narrow screens they collapse into a dropdown menu built on a no-JS `<details>` element.
- **Project chrome:** default SVG favicon (drop in your own to override), site footer with `rel="me"` social links, license line, and copyright — configured entirely from `hugo.toml`.

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

## Front-page header

The project front page renders a header with the site logo on the left and navigation in the top right: a Hugo menu of plain links (defined per language so `pageRef` resolves inside each language tree) next to a bar of social SVG icons. Icons are inline — no icon font, no external requests.

```toml
[[languages.en.menus.header]]
name = "Docs"
pageRef = "/docs/latest/"
weight = 10

[[params.docs.social]]
name = "GitHub"
url = "https://github.com/you/project"
icon = "github"   # optional; falls back to the lowercased name
```

Shipped icons: `github`, `x`, `bluesky`, `youtube`, `rss`; any other name renders a globe glyph. Override `layouts/partials/docs/helpers/social-icon.html` to add more brands.

On screens under 48rem the links and icons collapse into a dropdown menu on a `<details>` element — it opens and closes without JavaScript; the script bundle only adds close-on-outside-click and Escape.

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

## Content Security Policy

The theme emits exactly two inline bootstrap scripts (both wrapped in try/catch, parse-time only):

1. Theme preference restore in `head.html` (existing).
2. Sidebar pre-paint opener in `scripts.html` (D-09).

Everything else is deferred via `main.js`. Strict-CSP sites must hash-allowlist the two snippets (hashes change when edited — documented as a maintenance note) or relax to `'unsafe-inline'` for bootstrap only.


