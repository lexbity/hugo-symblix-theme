# hugo-theme-symblix

A Hugo documentation theme for structured, navigable, versioned, multilingual technical documentation. Documentation versions track releases of the matching software project.

## Highlights

- **No-JavaScript baseline:** reading, navigation, the table of contents, the version/language switchers, tabs, and search fallback all work with JavaScript disabled. JavaScript only adds enhancements (instant search, code copy buttons, saved theme preference, sidebar filtering).
- **Search:** each language publishes a `search-index.json`; the search page runs instant in-browser search over it (version/type/topic filters), and falls back to a server-rendered page catalog plus the browse index without JavaScript.
- **Syntax highlighting:** server-side Chroma highlighting with a theme-aware token palette — no client-side highlighter.
- **Versioning:** current + archived docs trees, a version switcher with page-equivalent resolution, `noindex` and sitemap exclusion for archived releases.
- **Multilingual:** per-language content trees, translation status warnings, and a language switcher that falls back gracefully when a page is untranslated.
- **Pre-built CSS:** ships compiled CSS so sites need only Hugo. Tailwind CSS v4 is an optional development dependency for styling from source.
- **Project front page:** `release`, `install`, and `downloads` shortcodes compose a software landing page — release badge, copyable install commands, and binary downloads — complete without JavaScript. Platform detection annotates the right download row as a JavaScript enhancement only.
- **Project chrome:** default SVG favicon (drop in your own to override), site footer with `rel="me"` social links, license line, and copyright — configured entirely from `hugo.toml`.

## Requirements

- Hugo (extended) — the template floor is 0.158; the optional Tailwind source build needs 0.161+.
- A top-level docs section (`content/<lang>/docs/…` by default, configurable via `params.docs.root`). Versioning features additionally read `data/docs_versions.yaml`; see the [Versioning](#example-site) docs page in the example site for the full model.
- With `defaultContentLanguageInSubdir = true`, Hugo renders the themed 404 per language (`/en/404.html`, …). Hosts that serve a single root 404 (GitHub Pages) should point their 404 setting at the default language's `404.html`.

## Development

The example site doubles as the theme documentation and links to itself through the symlink `exampleSite/themes/hugo-theme-symblix → ../..`. On Windows, enable symlink support before cloning (`git config --global core.symlinks true`, or run Git with developer mode); if the symlink was checked out as a plain file, recreate it manually.

```bash
npm install        # only needed for Tailwind source builds and tests
npm run dev        # example site, CSS compiled from Tailwind source (watches)
npm run dev:prebuilt
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
- [Customization](/en/docs/latest/customization/)

## Non-Goals

The theme intentionally omits the following. They are not bugs; they are design boundaries.

1. **No client-side dependency additions.** No search library, no font loader, no framework. Bundle budget stays ~12 KB minified JS.
2. **No fuzzy/typo-tolerant search.** The hand-rolled exact-token matcher stays. Revisit only with evidence.
3. **No "edit on GitHub", analytics bundling, or feedback widgets.** The `custom-head.html` hook is the sanctioned extension point; the theme ships none of them.
4. **No webfont bundling.** The theme MUST NOT load fonts from the network. Font configuration accepts stack declarations only.
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

## PDF Export

Whole-version PDF export is a possible future feature. No commitment, no timeline. The `custom-head.html` hook can be used to integrate external export tools.
