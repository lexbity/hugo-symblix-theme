# Docworkbench Changelog and Migration Notes

## Project front page (2026-09)

The front page can be composed as a software project landing page with three new content-driven shortcode families plus a platform-detection enhancement — all complete without JavaScript.

- `release` renders a "Latest release" badge (version, optional date, optional changelog link). Markup lives in `layouts/partials/docs/components/release.html` because the data source is expected to move to a release-CI-owned data file; the shortcode validates `version` and delegates. All string params are HTML-escaped; hrefs are never marked safe.
- `install` renders a command body as a byte-exact, copyable block, or a tabbed switcher when given two or more `install-method` children. Shared command-block markup lives in `layouts/partials/docs/components/install-command.html` so the single-command and method paths cannot drift. Command text is auto-escaped exactly once; copying uses the standard `[data-codeblock]` contract. Tab-composition of `install` is unsupported: the tab body runs markdown and can reflow the command.
- `downloads` + `download` render a static download grid with per-row platform metadata, checksum links, and size text. Every row renders unconditionally; nothing is filtered or hidden. `label` and `href` are required and fail the build when missing.
- `assets/js/downloads.js` annotates the row whose platform matches the visitor's system with a localized "Suggested for your system" badge and accent emphasis. Detection reads UA platform hints only, is conservative (iPadOS, Android, and ARM Linux yield no suggestion), never hides or reorders rows, and the badge is inline so row height is unchanged.
- The `hero` markup now has a single owner, `layouts/partials/docs/components/hero.html`, with two adapters: the `hero` shortcode and the contentless-home fallback in `layouts/index.html`. Output is byte-identical to the previous inline markup.
- The plain-lexer list (`text`, `txt`, `plain`, `plaintext`, `tree`) moved to `layouts/partials/docs/helpers/plain-lexers.html`, shared by the `code` shortcode and the codeblock render hook.
- i18n: six new keys (`install`, `download`, `latest_release`, `changelog`, `checksum`, `suggested_for_system`) across all four locales, with `tests/i18n.spec.ts` enforcing identical key sets.

## Search restored (static-first contract)

Search follows the engineering spec (§13): search is a JavaScript enhancement, the site must remain navigable without it, and the search area must provide a useful fallback.

- `layouts/index.searchindex.json` publishes a per-language `/{lang}/search-index.json` (title, description, url, language, version, docType, topics, plain-text content). Enable it with `[outputs] home = ["HTML", "RSS", "SearchIndex"]` (shipped by both the theme and the example site).
- `layouts/docs/search.html` + `layouts/partials/docs/search-page.html` render the search page: a GET form that works without JavaScript, filters (version, docType, topic), and a server-rendered page catalog as the no-JS fallback.
- `assets/js/search/index.js` provides the instant-search enhancement and `assets/js/search/adapters/fuse.js` remains the isolated scoring adapter.

## Syntax highlighting restored

The render hook and the `code` shortcode now render through Hugo's Chroma (`noClasses = false`), with token colors defined in `assets/css/components/code.css` for light, dark, and forced-colors modes. Unknown/neutral lexers (`txt`, `text`, `tree`, …) render as plain text.

## Copy-code buttons (JS-only enhancement)

`assets/js/copy-code.js` appends a copy button to every `[data-codeblock]`. The button exists only when JavaScript runs, so the no-JS baseline is unchanged.

## Switchers work without JavaScript

The version and language switchers are `<details>` link lists now — plain anchors, no inline `onchange` handlers, CSP-safe, and usable without JavaScript. Versions without a matching content tree are omitted from the switcher instead of silently pointing at the docs root.

## Manual navigation guard

`manual-nav-tree.html` resolves `page:` entries by translated path, then by the default-language path (so untranslated sidebars link to the source page), and emits `warnf` when a reference resolves nowhere — which fails `npm run check` (`--panicOnWarning`). Fix the data file rather than ignoring the warning.

## CSS delivery

The theme ships pre-built CSS (`assets/css/compiled/theme.css`); Hugo sites do not need Node. Tailwind remains the development path (`npm run dev`, `npm run build:css`).

## Historical note

An earlier revision of this file described the removal of search, copy-code, and sidebar behaviors as intentional. That removal was accidental fallout from a cleanup pass, not a design decision; the features are restored above (sidebar persistence and scroll-observation remain retired).
