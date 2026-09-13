+++
title = "Customization"
description = "Customize the theme by layering CSS and shaping content with shortcodes."
related = ["/en/docs/latest/components/", "/en/docs/latest/configuration/"]
weight = 70
+++

Customization is done with Hugo templates, CSS layers, and content authoring.

## CSS: pre-built by default, Tailwind optional

The theme ships pre-built CSS at `assets/css/compiled/theme.css`. A downstream site needs only Hugo — no Node.js, no npm, no security-policy changes — and pages load a single fingerprinted stylesheet.

The stylesheet is generated from a Tailwind CSS v4 entrypoint plus plain component layers, so you can customize with or without a Node toolchain:

- **Without Node:** add your own plain-CSS layers in the downstream site and override the theme's custom properties (`--docs-accent`, `--docs-border`, spacing, and so on) from `assets/css/theme.css`.
- **With Node (Tailwind source build):** install dependencies (`npm install`), edit `assets/css/input.css` and the component layers it imports, then regenerate the compiled file:

```bash
npm run build:css
```

For live development against the source layers, `npm run dev` compiles the CSS on each build (it sets `HUGO_PARAMS_DOCS_TAILWINDSOURCE=true`, which switches the theme from the compiled file to the Tailwind pipeline). This mode requires the Tailwind CLI to be allowed in Hugo's security policy — see [Configuration](/en/docs/latest/configuration/).

{{< details title="Styling entrypoint (source build)" >}}
```css
@import "tailwindcss";

@import "./theme.css";
@import "./components/shortcodes.css";
@import "./components/badges.css";
@import "./components/shell.css";
@import "./components/nav.css";
@import "./components/sidebar.css";
@import "./components/toc.css";
@import "./components/browse.css";
@import "./components/content.css";
```
{{< /details >}}

## Content customization

The theme's shortcodes cover the major documentation patterns:

- notices and callouts
- details and figures
- procedures and choice groups
- cards and landing pages
- reference blocks
- navigation and browse helpers

## Accessibility and performance

The theme keeps the public output static, semantic, and printable. That means any downstream customization should preserve headings, landmarks, and text-first navigation rather than replacing them with script-driven widgets.

{{< note title="Recommended rule" >}}
If a customization makes the page harder to read without JavaScript or in print, it conflicts with the theme's final supported contract.
{{< /note >}}
