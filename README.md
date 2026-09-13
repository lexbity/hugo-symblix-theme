# hugo-theme-docworkbench

A Hugo documentation theme for structured, navigable, versioned, multilingual technical documentation. Documentation versions track releases of the matching software project.

## Highlights

- **No-JavaScript baseline:** reading, navigation, the table of contents, the version/language switchers, tabs, and search fallback all work with JavaScript disabled. JavaScript only adds enhancements (instant search, code copy buttons, saved theme preference, sidebar filtering).
- **Search:** each language publishes a `search-index.json`; the search page runs instant in-browser search over it (version/type/topic filters), and falls back to a server-rendered page catalog plus the browse index without JavaScript.
- **Syntax highlighting:** server-side Chroma highlighting with a theme-aware token palette — no client-side highlighter.
- **Versioning:** current + archived docs trees, a version switcher with page-equivalent resolution, `noindex` and sitemap exclusion for archived releases.
- **Multilingual:** per-language content trees, translation status warnings, and a language switcher that falls back gracefully when a page is untranslated.
- **Pre-built CSS:** ships compiled CSS so sites need only Hugo. Tailwind CSS v4 is an optional development dependency for styling from source.

## Requirements

- Hugo (extended) — the template floor is 0.124; the optional Tailwind source build needs 0.161+.

## Development

The example site doubles as the theme documentation and links to itself through the symlink `exampleSite/themes/hugo-theme-docworkbench → ../..`. On Windows, enable symlink support before cloning (`git config --global core.symlinks true`, or run Git with developer mode); if the symlink was checked out as a plain file, recreate it manually.

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
hugo new --source exampleSite --theme hugo-theme-docworkbench content/en/docs/latest/my-page.md
hugo new --source exampleSite --theme hugo-theme-docworkbench --kind how-to content/en/docs/latest/user-guide/my-task.md
hugo new --source exampleSite --theme hugo-theme-docworkbench --kind tutorial content/en/docs/latest/tutorials/my-tutorial.md
```

Available archetypes: `default`, `tutorial`, `how-to`, `reference`, `explanation`, `migration`, `release-note`. The archetypes do not force any folder structure — use them wherever they fit your documentation tree.

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
