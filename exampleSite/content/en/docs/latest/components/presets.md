+++
title = "Presets"
description = "Color theme presets with bundled fonts and adaptive callout colors."
weight = 5
+++

{{< hero eyebrow="Visual identity" title="Presets" subtitle="Seven swappable color themes with bundled fonts and adaptive syntax highlighting." headingLevel="2" >}}

Symblix includes seven built-in **color presets** that define complete, harmonious palettes for your documentation site. Each preset includes base colors, callout colors, and badge colors, and adapts syntax highlighting automatically based on its mode (light or dark).

{{< /hero >}}

## Overview

The preset system replaces the previous light/dark/system triad with seven distinct color themes:

| Preset | Mode | Description |
|--------|------|-------------|
| `symblix-light` | Light | Clean, neutral light theme with blue accent |
| `symblix-dark` | Dark | Deep, focused dark theme with blue accent |
| `ocean-dark` | Dark | Deep blue-teal dark theme |
| `forest-light` | Light | Warm, green-tinted light theme |
| `sunset-dark` | Dark | Warm amber-purple dark theme |
| `solarized-light` | Light | Classic Solarized light palette |
| `high-contrast` | Light | Maximum contrast for accessibility (WCAG AAA) |

### Live Preview

Select a preset using the theme switcher in the sidebar or header to see how it transforms the entire site, including:

- Page background and text colors
- Callout borders and backgrounds
- Badge colors
- Syntax highlighting (automatically switches between light/dark palettes)
- Code block styling

## Configuration

### Site Default Preset

Set the default preset in your `hugo.toml`:

```toml
[params.docs.theme]
preset = "symblix-light"
```

This preset is applied to all visitors who haven't selected a preference. The value must be one of the preset IDs listed above or a custom preset you've defined.

### Available Presets

Control which presets appear in the switcher UI:

```toml
[params.docs.theme]
preset = "symblix-light"
availablePresets = ["symblix-light", "symblix-dark", "ocean-dark"]
```

If `availablePresets` is not specified, all defined presets (theme defaults + project overrides) are available.

### Visual Preset (Density)

The visual preset controls corner rounding and spacing, separate from color presets:

```toml
[params.docs.theme]
visualPreset = "minimal"  # Options: minimal, rounded, high-contrast
density = "comfortable"    # Options: comfortable, compact, dense
```

### Font Configuration

Override the default bundled fonts:

```toml
[params.docs.theme]
fonts = {
  body = "MyCustomFont, ui-sans-serif, system-ui, sans-serif",
  mono = "MyCustomMono, ui-monospace, monospace"
}
```

## Custom Presets

### Defining Custom Presets

Create a `data/docs_presets.yaml` file in your project to add or override presets:

```yaml
presets:
  - id: my-light
    label: My Light Theme
    description: Custom light theme for my brand
    mode: light
    colors:
      bg: "#ffffff"
      surface: "#f8f9fa"
      surface2: "#e9ecef"
      text: "#212529"
      muted: "#6c757d"
      border: "#dee2e6"
      accent: "#0d6efd"
    callouts:
      note: "#6c757d"
      tip: "#198754"
      info: "#0d6efd"
      warning: "#ffc107"
      danger: "#dc3545"
      success: "#198754"
      deprecated: "#6f42c1"
      experimental: "#fd7e14"
    badges:
      info: "#0d6efd"
      warning: "#ffc107"
      success: "#198754"
      danger: "#dc3545"
```

### Required Fields

Each preset must define:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (lowercase-hyphenated) |
| `label` | string | Yes | Human-readable name |
| `mode` | string | Yes | `light` or `dark` |
| `colors` | map | Yes | Base color tokens |

The `colors` map must include:
- `bg` - Page background
- `surface` - Card/surface background
- `surface2` - Secondary surface
- `text` - Primary text color
- `muted` - Muted/secondary text
- `border` - Border color
- `accent` - Accent/interactive color

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `description` | string | - | Preset description |
| `callouts` | map | Derived from accent | Callout colors (note, tip, info, warning, danger, success, deprecated, experimental) |
| `badges` | map | Derived from accent | Badge colors (info, warning, success, danger) |

If `callouts` or `badges` are omitted, reasonable defaults are derived from the preset's base colors.

## Color Tokens

Each preset defines the following CSS custom properties on the `<html>` element:

### Base Colors

| Token | Purpose |
|-------|---------|
| `--docs-bg` | Page background |
| `--docs-surface` | Card/surface background |
| `--docs-surface-2` | Secondary surface |
| `--docs-text` | Primary text color |
| `--docs-muted` | Muted/secondary text |
| `--docs-border` | Border color |
| `--docs-accent` | Accent/interactive color |

### Callout Colors

| Token | Purpose |
|-------|---------|
| `--docs-callout-note` | Note callout |
| `--docs-callout-tip` | Tip callout |
| `--docs-callout-info` | Info callout |
| `--docs-callout-warning` | Warning callout |
| `--docs-callout-danger` | Danger callout |
| `--docs-callout-success` | Success callout |
| `--docs-callout-deprecated` | Deprecated callout |
| `--docs-callout-experimental` | Experimental callout |

### Badge Colors

| Token | Purpose |
|-------|---------|
| `--docs-badge-info` | Info badge |
| `--docs-badge-warning` | Warning badge |
| `--docs-badge-success` | Success badge |
| `--docs-badge-danger` | Danger badge |

### Syntax Highlighting

Syntax highlighting uses a separate `data-syntax` attribute that is automatically synced with the preset's mode:

- Light presets → `data-syntax="light"`
- Dark presets → `data-syntax="dark"`

This ensures syntax colors remain consistent and familiar across all presets, while still respecting the overall theme's readability.

## User Experience

### Preset Selection

Users can switch presets using either:

1. **Sidebar switcher** - Full list with swatches and descriptions
2. **Header switcher** - Compact icon button with dropdown

Both switchers stay in sync, and the selection persists across page loads and browser sessions via `localStorage`.

### No-JavaScript Baseline

Without JavaScript:
- The default preset (from configuration) is always applied
- When the OS asks for `prefers-color-scheme: dark`, the light default maps to its dark tokens via a pure-CSS media query (an explicit choice always wins)
- The preset switcher UI is hidden
- The site remains fully readable and navigable

Switching presets is a JavaScript enhancement: static sites have nowhere to
store a visitor's choice between page loads, so persistence (and therefore the
switcher) needs scripting. Visitors with JavaScript who have not picked a
preset get the same OS dark-mode treatment through the pre-paint script.

### Keyboard Navigation

Both switchers are fully keyboard navigable:
- Tab to focus the toggle or options
- Enter/Space to activate
- Escape to close
- Arrow keys to navigate (in header dropdown)

## Accessibility

### Color Contrast

All presets meet WCAG 2.1 AA contrast requirements:

- Normal text: 4.5:1 minimum ratio
- Large text: 3:1 minimum ratio
- UI components: 3:1 minimum ratio

The `high-contrast` preset exceeds these requirements, meeting WCAG 2.1 AAA:

- Normal text: 7:1 minimum ratio
- Large text: 4.5:1 minimum ratio

### Screen Readers

The switcher includes appropriate ARIA attributes:
- `aria-label` on the switcher toggle
- `aria-current="true"` on the active preset
- Proper semantic HTML (`<details>`, `<summary>`, `<button>`, `<ul>`, `<li>`)

## Bundled Fonts

Symblix bundles two open-source variable font families under the SIL Open Font License 1.1:

| Family | Weights | Files |
|--------|---------|-------|
| Inter | 100-900 | `Inter-Variable.woff2`, `Inter-Variable-Italic.woff2` |
| JetBrains Mono | 100-800 | `JetBrainsMono[wght].woff2`, `JetBrainsMono-Italic[wght].woff2` |

### Font Loading

- Critical fonts are preloaded in the `<head>`
- `font-display: swap` ensures text remains visible during loading
- System font fallbacks are used if fonts fail to load

### Custom Fonts

To use custom fonts, either:

1. Override via configuration (as shown above)
2. Replace the bundled font files in `static/fonts/`
3. Disable preloading in your layout

## Backward Compatibility

The preset system maintains backward compatibility with the previous light/dark/system theme system:

| Old `data-theme` | Maps to preset |
|-----------------|----------------|
| `light` | `symblix-light` |
| `dark` | `symblix-dark` |
| `system` | `symblix-light` |

Legacy `localStorage["docs-theme"]` values are automatically migrated to `localStorage["docs-preset"]` on first load.

The `window.SymblixTheme` API continues to work, with `set()` and `get()` methods mapping legacy theme values to preset IDs.

## Mermaid Diagrams

Mermaid diagrams automatically adapt to the active preset's mode via the `data-syntax` attribute. Light presets show light-themed diagrams, dark presets show dark-themed diagrams.

## Migration Guide

### For Site Authors

To migrate from the old theme system:

1. **Remove** any `data-theme` attributes from your layouts (they're now set automatically)
2. **Update** your `hugo.toml` to use the new `preset` configuration:
   ```toml
   [params.docs.theme]
   preset = "symblix-light"
   ```
3. **Optional**: Customize the available presets or create custom presets
4. **Test**: Verify all pages render correctly with each preset

### For Theme Developers

If you're extending Symblix:

1. Add custom presets to `data/docs_presets.yaml` in your theme
2. Reference preset tokens in your CSS using `var(--docs-*)`
3. Avoid hardcoding color values
4. Use `data-preset` and `data-syntax` attributes for preset-specific styling

## Technical Details

### CSS Architecture

- Base tokens are defined in `theme.css`
- Preset colors are in `presets.css` (generated from YAML)
- Syntax palettes are in `syntax-light.css` and `syntax-dark.css`
- Font declarations are in `fonts.css`
- All files are compiled into a single `theme.css` at build time

### JavaScript API

The `window.SymblixTheme` object provides:

```javascript
// Legacy API (backward compatible)
SymblixTheme.set("dark")  // Sets preset to "symblix-dark"
SymblixTheme.get()        // Returns current preset ID

// New API
SymblixTheme.setPreset("ocean-dark")  // Set by preset ID
SymblixTheme.getPreset()              // Get current preset ID
SymblixTheme.getSyntax()              // Get current syntax mode
SymblixTheme.getAvailable()           // Get array of available preset IDs
```

### Performance

- CSS payload increase: ~25% (from ~2,700 to ~3,400 lines)
- Font payload: ~1.07 MB (4 WOFF2 variable font files)
- All fonts cached aggressively
- `font-display: swap` prevents invisible text

### Browser Support

- Chrome/Edge 90+: Full support
- Firefox 88+: Full support
- Safari 15+: Full support (with `color-mix()` from 16.2+)
- Fallbacks provided for Safari < 16.2

## See Also

- [Callouts](/en/docs/latest/components/callouts/) - Semantic callout shortcodes
- [Code Blocks](/en/docs/latest/components/code-blocks/) - Syntax-highlighted code with titles
- [Landing Components](/en/docs/latest/components/landing/) - Hero, feature, and CTA blocks
