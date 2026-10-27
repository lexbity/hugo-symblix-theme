# Symblix Changelog and Migration Notes

## Layout audit fixes, no-JS auto dark, subpath-safe fonts (2026-10)

- **Preset switcher label sync (bug fix):** `updateSwitcher` matched the first `[data-preset-label]` in the switcher, which on the header switcher was the first *option button* — every page load overwrote that button's swatch and name with the active preset's label. The summary label now uses a dedicated `data-preset-current` attribute, and the header summary swatch (`data-preset-swatch-bg/-accent`) tracks the active option's colors.
- **OS dark mode without an explicit choice:** a pure-CSS `prefers-color-scheme: dark` fallback in `presets.css` (plus diagram swapping in `figures.css`) maps the light default to its dark tokens for visitors who never picked a preset — including no-JS readers. JS visitors get the same treatment pre-paint in `head.html`. Explicit choices set `data-preset-source="user"`, which disables the fallback.
- **Tables no longer overflow mobile:** new `render-table.html` hook wraps every Markdown table in the `.table-wrap` scroll container that `tables.css` already styled; previously no wrapper was generated and the 40rem table min-width forced page-level horizontal scroll at phone widths.
- **Fonts are subpath-safe:** `fonts.css` became a Hugo-templated resource (rendered by `head.html` with `relURL` values) and the font preloads switched from hardcoded `/fonts/…` to `relURL` — on GitHub Pages project sites both previously 404'd. `fonts.css` is no longer imported by `input.css`; the Tailwind-source and prebuilt CSS paths both emit the templated stylesheet.
- **Palette contrast fixes (WCAG):** light-preset callout colors that sat below the 3:1 UI threshold were darkened — symblix-light tip/warning/success/experimental, forest-light tip/info/warning/success/experimental, solarized-light note/tip/warning/success. Solarized-light body text, muted text, and accent were darkened to clear 4.5:1 against both background and surface (`#516773`, `#54686e`, `#16678f`); forest-light accent is now `#166534`. Update any downstream overrides that copied the old values from `data/docs_presets.yaml` / `presets.css`.
- **Header layout:** the front-page preset swatch no longer floats mid-header; the right-hand group (nav + switcher) is right-aligned via an auto margin on the last header child.
- **Example site:** placeholder `github.com/OWNER/hugo-theme-symblix` URLs (footer social link, release/download hrefs, `theme.toml` homepage) now point at the real repository path `lexbity/hugo-symblix-theme`.
- **Hygiene:** removed the dead `.docs-switcher-select` rule, a redundant condition in `site-header.html`, and the unused `is-active` class writes in `theme.js`; Tailwind packages moved from `dependencies` to `devDependencies`; four i18n keys (`theme`, `light`, `dark`, `system`) removed from all locales.
- **Tests:** `identity.spec` no longer hardcodes an absolute repo path; FCP/LCP tests navigate before measuring; the duplicate-preset-selector check counts strings instead of building an unescaped RegExp; stale assertions updated for the preset switcher (sidebar tests no longer click the mobile-only drawer toggle at desktop width); new tests cover the table wrapper, the no-JS OS dark fallback, and explicit-choice precedence. CSS budget re-based to 88 KB minified (92 KB hard fail) to reflect the preset system.

## Renamed to Symblix (2026-09-20)

- The theme is now published as `hugo-theme-symblix` (module/theme id). The `theme.toml` name, `package.json` name, `exampleSite/themes/` symlink, and all `--theme` flags in `package.json` scripts are updated.
- The JS global `window.DocworkbenchTheme` is renamed to `window.SymblixTheme` (no compatibility alias).
- User-visible strings in the example site (home page titles, hero, footer copyright, logo alt) now read "Symblix".
- Example CLI commands and download URLs now use `symblix` as the binary name and `OWNER/hugo-theme-symblix` as the placeholder repo.
- The `data-docs-*` attributes, CSS custom-property prefix (`--docs-*`), `params.docs.*` config namespace, localStorage key (`docs-theme`), and CSS class namespace (`docs-*`) are **unchanged** — they are generic and renaming them buys nothing but diff noise.
- Historical mentions of "Docworkbench" in this file are preserved as the rename allowlist; the grep gate in CI permits matches only in `docs/migration-notes.md`.

## Robustness, search scale, and project chrome (2026-09)

- **Fixes:** `toc.html` no longer emits an `isset` warning (and thus no `--panicOnWarning` build failure) when a downstream site does not define `[params.docs]`. The CI workflow installs Hugo (it previously never did, so `npm run check` failed on a clean runner). The version-root helper warns when a version id has no content section in any language; `versions.warnUnresolved = true` opts into warnings when page-equivalent resolution falls back to a version root. The manual nav label fallback compares against the configured default language instead of a hardcoded `en`.
- **404:** the theme now provides `layouts/404.html` with the full docs shell, localized across all four locales. Hosts serving a single root 404 (GitHub Pages) should point that setting at the default language's `404.html`.
- **Sitemap:** the custom sitemap now emits `xhtml:link` hreflang alternates (self + translations) for translated pages; the namespace was previously declared but unused.
- **Language tags:** `<html lang>`, head alternates, and language-switcher anchors all use one helper (`partials/docs/helpers/language-code.html`) built on `.Language.Locale` — `LanguageCode` is deprecated since Hugo 0.158. Sites that configure per-language `locale` get consistent tags everywhere.
- **Search:** the per-language index strips `<pre>` blocks before plainifying (code dominated payload size without helping ranking) and excludes archived versions when `versions.noindexArchived = true`, matching the sitemap/noindex policy. Results now render a context snippet around the first query match. The filter bar is server-rendered `hidden` and only revealed once the index loads, so no-JS readers never see empty selects. The scoring adapter was renamed `assets/js/search/adapters/matcher.js` (it is a hand-rolled scorer, not Fuse).
- **Versioned navigation:** a data file named `{nav.data}_{version}` (e.g. `data/docs_nav_v1.0.yaml`) overrides the sidebar tree for pages in that version. The example site ships one for v1.0.
- **Project chrome:** the theme ships a default `static/favicon.svg` (a site's own file wins); new `params.docs.social` list renders `rel="me"` links in the site footer; `params.docs.footer` (copyright, licenseURL, licenseLabel, poweredBy) replaces the title-only footer stub. `layouts/partials/footer.html` was renamed `scripts.html` — it was always the JS loader, and the name collided with the new footer partial. The `home` archetype now derives hero and card hrefs from `site.Home.RelPermalink` and `params.docs.root` instead of hardcoding `/docs/latest/`.
- **CSS build contract:** `assets/css/input.css` now pins Tailwind's candidate detection with `source(none)` plus explicit `@source` entries for `layouts/` and `assets/js/`. Auto-detection also scanned docs prose, where ordinary words matching utility names ("filter", "container", …) silently changed the compiled stylesheet and tripped the css-drift gate. Regenerating after this change is required once; downstream builds from source need no action.
- **Tests:** suite grew from 42 to 47 specs — archived-version index exclusion, per-version sidebar nav, no-JS filter hiding, themed 404, and footer links.

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

## Symblix Rework — Full Release (2026-09-20)

This release completes the transition from "works well for its author" to "reusable, configurable, and publishable."

### Slice 0 — Identity Rename
- Theme id: `hugo-theme-docworkbench` → `hugo-theme-symblix`
- JS global: `window.DocworkbenchTheme` → `window.SymblixTheme` (no alias)
- Example site titles, hero, footer, logo alt, download URLs: all Symblix
- CSS namespace (`--docs-*`, `docs-*`), `params.docs.*`, localStorage `docs-theme` **unchanged**
- Allowlist for grep gate: `docs/migration-notes.md` only

### Slice 1 — Token Consolidation
- `assets/css/theme.css` is now the single definition site for all `--docs-*` tokens
- Dead tokens removed: `--docs-component-gap`, `--docs-component-padding`
- Font tokens: `--docs-font-body`, `--docs-font-mono` (system stacks; `Inter` dropped)
- Callout/status/warning colors promoted to tokens (light/dark/forced)
- Syntax-highlight palette moved from `code.css` into `theme.css` (deduped)
- All components consume tokens only; no raw palette hexes in components
- Cross-reference comment in `theme.css` documents D-03 cascade contract

### Slice 2 — Palette & Fonts Config, Head Hook, Templated Favicon
- New config under `[params.docs.theme]`: `colors` (accent shorthand or full light/dark 7-key maps), `fonts` (body/mono stacks)
- Validation: hex-only colors, enum checks, dark completeness (all-or-none), unknown keys
- Palette override emitted in `head.html` with exact D-03 selector/media shape:
  - Fonts: `:root` only
  - Non-accent: `@media (forced-colors: none)` with `:root, html[data-theme="light"]`, `html[data-theme="dark"]`, `@media (prefers-color-scheme: dark)` for system
  - Accent/border: additionally `@media (prefers-contrast: no-preference)`
  - `prefers-contrast: more`, `forced-colors: active` defeat user palette
  - `preset = "high-contrast"`: build-time suppression (no override emitted)
- Favicon: `static/favicon.svg` deleted; `assets/favicon.svg` template uses resolved light accent; precedence: param > template
- `docs/custom-head.html`: empty extension hook, invoked last in `head.html`

### Slice 3 — Truthful Switchers, Linked Banner, Guarded x-default
- New strict helper: `version-root-strict.html` (no fallback to docs root, no cross-language scan)
- Version switcher: skips versions without content section in current language
- Language switcher: option appears iff target language has current version tree; omitted entirely if only 1 qualifies; removed docs-root/home fallback links
- Version banner: links equivalent page in latest version with derived label; two i18n keys (`warning_old_version` + `warning_latest_link`), no HTML in translations
- x-default hreflang: emitted only when default-language equivalent page actually exists

### Slice 4 — Sidebar No-JS Default State
- Sidebar markup ships **closed** (no `open` attribute)
- Pre-paint inline script opens on desktop (`matchMedia("(min-width: 72rem)")`) before first paint
- Desktop collapsed state via `.docs-shell:has(> .docs-sidebar:not([open]))` — grid column shrinks, toggle visible
- No-JS mobile: no un-dismissed overlay; toggle works; content fully reachable
- Graceful degradation: browsers without `:has()` show empty-strip layout; toggle remains clickable

### Slice 5 — Derived Versioning
- Version list derived from default language's section tree (pure function)
- `data/docs_versions.yaml` demoted to optional per-field override (`label`, `archived`)
- SemVer dirs parsed, weight-sorted desc; `keepLive` (default 1) determines archived boundary
- Reserved dirs: `latest`/`current` (alias), others must match semver
- All consumers migrated: `head.html`, `sitemap.xml`, `searchindex.json`, switchers, banner, `version-root.html`
- Example site: v1.0 moved to `archives/` and mounted; `docs_versions.yaml` shrunk to override

### Slice 6 — i18n Completion & Search Runtime Polish
- 14 new keys ×4 locales: callout titles, hero buttons, heading anchor, reference meta, figure fallback, search filter placeholders, search lifecycle, clear button, results heading, filter heading, banner link
- Fixed `browse_docs` → `browse_docs_home` mismatch
- Deleted dead keys: `search_results`, `download`
- Enforcement tests: referenced⊆defined, defined⊆referenced (with shortcode/JS allowlist)
- Search: haystacks precomputed once (`precomputeEntries`); query semantics frozen + golden test
- Search page: localized "All" placeholders (`data-all-*`), loading/empty/error states, clear button, filter heading, results aria-label

### Slice 7 — Publication Hardening
- `unsafe = true` removed from example site; all raw HTML converted to shortcodes/markdown
- `theme.toml` `min_version = "0.158.0"` (was 0.124)
- CI matrix: Hugo 0.158.0 + 0.166.0 (floor verified)
- README: Non-Goals, Revisit Triggers, Privacy (zero external requests), CSP (two inline snippets), PDF export future note
- `npm run screenshots` script + `tests/screenshots.spec.ts` for curated README images
- `docs/migration-notes.md`: one entry per slice with honest tradeoffs

### Breaking Changes Summary
| Area | Before | After |
|------|--------|-------|
| Theme id | `hugo-theme-docworkbench` | `hugo-theme-symblix` |
| JS global | `window.DocworkbenchTheme` | `window.SymblixTheme` (no alias) |
| Favicon | `static/favicon.svg` (drop-in) | `assets/favicon.svg` template; param `params.docs.favicon` wins |
| `unsafe` | Required in example | Removed; extend via shortcodes |
| `data/docs_versions.yaml` | Primary source | Optional per-field override only |
| Sidebar no-JS | `open` (mobile overlay) | Closed; toggle works; pre-paint opens on desktop |
| Language switcher | Falls back to docs root/home | Omitted if no other language qualifies |
| x-default hreflang | Always emitted | Only when default-lang page exists |
| Search filter "All" | Hardcoded "All" | Localized via i18n + data attributes |

### Migration Notes for Downstream Sites
1. Update `theme = "hugo-theme-symblix"` in `hugo.toml`
2. Update symlink: `exampleSite/themes/hugo-theme-symblix → ../..`
3. Rename `window.DocworkbenchTheme` → `window.SymblixTheme` if used
4. Remove `[markup.goldmark.renderer] unsafe = true`; convert raw HTML to shortcodes
5. If using custom favicon, set `params.docs.favicon = "your-favicon.svg"`
6. If using `data/docs_versions.yaml`, trim to only `label`/`archived` overrides; remove `current`, `weight`, full version list
7. Set `[params.docs.versions] keepLive = N` if you want more than 1 live version (default 1)
8. Add `docs/custom-head.html` in your site to inject analytics/fonts/verification tags
9. Review palette config if you want brand colors: `[params.docs.theme.colors.accent = "#yourhex"]`
10. Test no-JS: sidebar toggle works, switchers are plain links, search fallback renders

## Visual Identity: Preset Color System, Bundled Typography (SYM-VIS-001)

### Slice 1 — Preset Color System & Font Bundling (Phase 1-6)

This slice introduces a comprehensive visual identity system with seven swappable color presets, bundled fonts, and adaptive callout colors.

#### New Features

1. **Seven Color Presets**: `symblix-light`, `symblix-dark`, `ocean-dark`, `forest-light`, `sunset-dark`, `solarized-light`, `high-contrast`
2. **Bundled Fonts**: Inter (body) and JetBrains Mono (code) as WOFF2 variable fonts, self-hosted
3. **Dual Preset Switchers**: Sidebar footer and front-page header
4. **Adaptive Callouts**: Callout colors adapt to each preset's accent
5. **Automatic Syntax Switching**: Syntax highlighting switches between light/dark palettes based on preset mode
6. **Separate `data-syntax` Attribute**: For syntax highlighting, decoupled from preset selection

#### Configuration

```toml
[params.docs.theme]
preset = "symblix-light"        # Default preset ID
availablePresets = ["symblix-light", "symblix-dark", ...]  # Switcher options
visualPreset = "minimal"        # Visual style (minimal/rounded/high-contrast)
density = "comfortable"         # Spacing (comfortable/compact/dense)
fonts = {
  body = "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono = "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
}
```

#### Custom Presets

Create `data/docs_presets.yaml` in your project:

```yaml
presets:
  - id: my-theme
    label: My Theme
    mode: light
    colors:
      bg: "#ffffff"
      surface: "#f8f9fa"
      surface2: "#e9ecef"
      text: "#212529"
      muted: "#6c757d"
      border: "#dee2e6"
      accent: "#0d6efd"
    callouts:  # Optional; derived if omitted
      info: "#0d6efd"
      warning: "#ffc107"
      # ... all 8 callout types
    badges:  # Optional; derived if omitted
      info: "#0d6efd"
      warning: "#ffc107"
      # ... all 4 badge types
```

#### Breaking Changes

| Area | Before | After | Migration |
|------|--------|-------|----------|
| Theme switcher | `<select>` with light/dark/system | `<details>` with 7 presets | Remove old `theme-switcher.html`, use `preset-switcher.html` |
| Theme attribute | `data-theme="light\|dark\|system"` | `data-preset="<id>"` | Legacy values auto-mapped; `data-theme` still works but deprecated |
| localStorage key | `docs-theme` | `docs-preset` | Auto-migrated on first load |
| Config key `preset` | Visual preset (minimal/rounded/high-contrast) | Color preset ID | Renamed to `visualPreset` in theme config; use `params.docs.theme.preset` for color preset |
| Fonts | System fonts only | Bundled Inter + JetBrains Mono | Self-hosted, no external requests |
| Syntax attribute | N/A | `data-syntax="light\|dark"` | Auto-set based on preset mode |

#### Migration Path

1. **Update configuration**: Add `[params.docs.theme]` with `preset` and `availablePresets`
2. **Rename `preset` to `visualPreset`**: If you were using `params.docs.theme.preset` for visual styling, it's now `visualPreset`
3. **Remove old theme-switcher**: Delete `layouts/partials/docs/theme-switcher.html` if it exists
4. **Verify switcher UI**: The new preset switchers appear in sidebar and header
5. **Test all presets**: Ensure each preset renders correctly with proper contrast
6. **Update CSP**: If using strict CSP, allowlist the pre-paint preset script in `head.html`

#### Files Changed

- New: `data/docs_presets.yaml` (theme defaults)
- New: `layouts/partials/docs/preset-switcher.html` (sidebar)
- New: `layouts/partials/docs/header-preset-switcher.html` (header)
- New: `assets/css/components/preset-switcher.css`
- New: `assets/fonts/inter/*.woff2` (4 files)
- New: `assets/fonts/jetbrains-mono/*.woff2` (4 files)
- New: `assets/css/fonts.css` (font-face declarations)
- New: `assets/css/presets.css` (generated preset colors)
- New: `assets/css/syntax-light.css`, `assets/css/syntax-dark.css`
- Modified: All baseof templates (added `data-preset`, `data-syntax`)
- Modified: `layouts/partials/docs/sidebar.html` (uses new preset-switcher)
- Modified: `layouts/partials/docs/site-header.html` (added header preset-switcher)
- Modified: `assets/css/input.css` (added new imports)
- Modified: All i18n files (added `theme_preset`, `select_preset`)
- Deleted: `layouts/partials/docs/theme-switcher.html`
- Deleted: `layouts/partials/docs/helpers/palette.html`

#### Verification

Run the following to verify:

```bash
npm run check          # Build with --panicOnWarning
npm test              # Run Playwright test suite
```

All tests should pass, including:
- Preset switching works in both locations
- localStorage persistence works
- Backward compatibility (data-theme mapping)
- Fonts load without external requests
- Accessibility (axe-core passes)
- Visual regression screenshots

#### Known Limitations

1. **Preset switcher requires JavaScript**: Without JS, users see the default preset only; the switcher is hidden
2. **Font bundle size**: ~1.07 MB for 4 WOFF2 variable font files
3. **CSS size increase**: ~25% for preset color definitions
4. **Safari < 16.2**: `color-mix()` fallbacks provided

#### Backward Compatibility

- `data-theme="light\|dark\|system"` continues to work, mapped to `symblix-light`, `symblix-dark`, `symblix-light`
- `window.SymblixTheme.set("dark")` maps to `setPreset("symblix-dark")`
- Legacy `localStorage["docs-theme"]` auto-migrates to `localStorage["docs-preset"]`
- Sites without preset configuration default to `symblix-light`

Full deprecation of `data-theme` planned for next major version.
