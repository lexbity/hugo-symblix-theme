# hugo-theme-docworkbench

A Hugo documentation theme for structured, navigable, versioned, multilingual technical documentation with a no-JavaScript baseline and optional enhancements.

## Development

Run the example site from the repository root:

```bash
npm run dev
```

Build the example site:

```bash
npm run build
```

Run a stricter Hugo check:

```bash
npm run check
```

## Authoring

The theme includes archetypes for common documentation page types.

Create a new page with one of the archetypes:

```bash
hugo new --source exampleSite --theme hugo-theme-docworkbench content/en/docs/latest/my-page.md
hugo new --source exampleSite --theme hugo-theme-docworkbench --kind how-to content/en/docs/latest/user-guide/my-task.md
hugo new --source exampleSite --theme hugo-theme-docworkbench --kind tutorial content/en/docs/latest/tutorials/my-tutorial.md
```

Available archetypes:

- `default`
- `tutorial`
- `how-to`
- `reference`
- `explanation`
- `migration`
- `release-note`

The archetypes do not force any folder structure. Use them wherever they fit your documentation tree.

## Example Site

The example site doubles as the theme documentation. Start with these pages:

- [Getting Started](/en/docs/latest/getting-started/)
- [Configuration](/en/docs/latest/configuration/)
- [Navigation](/en/docs/latest/navigation/)
- [Versioning](/en/docs/latest/versioning/)
- [Multilingual](/en/docs/latest/multilingual/)
- [Search and Browse](/en/docs/latest/search/)
- [Components](/en/docs/latest/components/)
- [Customization](/en/docs/latest/customization/)

## Scope

This repository now includes the static documentation shell, multilingual support, versioned docs, browse pages, navigation, theme preference controls, and authoring templates.

See [docs/migration-notes.md](docs/migration-notes.md) for the removed JS-only layers and the final supported authoring surface.
