+++
title = "Customization"
description = "Customize the theme by layering CSS and shaping content with shortcodes."
related = ["/en/docs/latest/components/", "/en/docs/latest/configuration/"]
weight = 70
+++

Customization is done with Hugo templates, CSS layers, and content authoring.

## CSS and Tailwind

The theme ships a single Tailwind entrypoint plus a set of component layers. Downstream sites can extend or override those layers without changing the theme's layout templates.

{{< details title="Styling entrypoint" open=true >}}
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
