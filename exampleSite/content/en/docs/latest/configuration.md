+++
title = "Configuration"
nav = { title = "Configure" }
description = "Configure the theme, the content tree, and the example site from scratch."
since = "v1.2"
experimental = true
tags = ["configuration"]
related = ["/en/docs/latest/getting-started/", "/en/docs/latest/navigation/"]
weight = 20
+++

Configuration is where the theme becomes your site rather than the example site.

## Minimal Hugo config

This is the smallest useful shape for a Docworkbench-style site:

```toml
baseURL = "https://example.com/"
title = "My Docs"
theme = "hugo-theme-docworkbench"
defaultContentLanguage = "en"
defaultContentLanguageInSubdir = true

[params.docs]
root = "docs"
editURLBase = "https://example.com/edit/"
rightToc = true

[params.docs.nav]
mode = "manual"
data = "docs_nav"
```

## Content tree

The example site expects a straightforward tree of Markdown pages:

```txt
content/
  en/
    docs/
      latest/
        _index.md
        getting-started.md
        configuration.md
        navigation.md
```

The example site adds more pages, but the core idea stays the same: use folders and `_index.md` for navigation groups, use front matter `weight` for ordering, and let Hugo build the tree.

## What not to configure

{{< warning title="Retired runtime features" >}}
The final static release does not require configuration for live search, theme switching, copy-code buttons, or sidebar persistence. Those layers were intentionally removed in the cleanup phase.
{{< /warning >}}

## CSS customization

The theme styles are centralized in `assets/css/input.css` and the component layers it imports. Override them by adding more CSS layers in your downstream site rather than patching the templates directly.

{{< details title="Current CSS entrypoint" open=true >}}
```css
@import "tailwindcss";

@import "./theme.css";
@import "./components/shortcodes.css";
@import "./components/badges.css";
@import "./components/shell.css";
@import "./components/nav.css";
@import "./components/sidebar.css";
```
{{< /details >}}
