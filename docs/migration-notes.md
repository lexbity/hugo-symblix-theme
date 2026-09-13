# Docworkbench Changelog and Migration Notes

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
