# Docworkbench Migration Notes

This repository now treats the shortcode and docs shell as a static, no-JavaScript system.

## What changed

- The runtime JS bundle was reduced to the theme-preference controller.
- Search, copy-code controls, and sidebar persistence/scrollspy behaviors were retired.
- The sidebar now renders static navigation, language/version dropdowns, browse links, and a visible theme preference control.
- Code blocks now render without a copy button or client-side bootstrap.

## Deprecated implementation layers

The following implementation files were removed as part of the cleanup:

- `assets/js/sidebar.js`
- `assets/js/search.js`
- `assets/js/copy-code.js`
- `layouts/partials/docs/search.html`
- `layouts/index.search.json`

## Final supported authoring surface

Use the static Hugo templates and shortcode families that remain in the repository:

- Notices and callouts
- Details and figures
- Procedures and choice groups
- Landing pages and cards
- Reference blocks
- Navigation and discovery blocks
- Render hooks for headings, links, images, and fenced code blocks

## Practical authoring notes

- Prefer Hugo-native navigation and browse links over client-side search.
- Use the versioned multilingual content tree for all translated documentation.
- Keep code blocks, tables, and images readable without any client-side enhancement.
- Treat `docs/migration-notes.md` as the canonical record for the removed JS-only behaviors.
