+++
title = "Navigation"
description = "Understand automatic and manual navigation, page ordering, and browse fallbacks."
related = ["/en/docs/latest/getting-started/", "/en/docs/latest/components/navigation/"]
weight = 30
+++

Navigation is the theme's core structure. It is generated from the content tree by default and can be overridden with optional data when you need a curated sidebar.

## Automatic navigation

Use Hugo section pages and `weight` values to shape the sidebar:

```txt
content/
  en/
    docs/
      latest/
        _index.md
        getting-started.md
        navigation.md
        components/
          _index.md
          callouts.md
```

Automatic navigation is the default because it keeps authoring close to content.

## Manual navigation

When you need an explicit sidebar order, use `data/docs_nav.yaml`. The example site keeps a manual tree so it can demonstrate the override path without changing the content structure.

{{< section-map root="/en/docs/latest/" title="Documentation tree" depth="3" showDescriptions="true" />}}

{{< child-pages root="/en/docs/latest/" title="Top-level pages" showDescriptions="true" />}}

## Hidden pages

Pages can be hidden from navigation with front matter:

```toml
hidden = true
```

That keeps draft, internal, or temporary content out of the sidebar while leaving the page buildable.

## Browse fallback

If a reader wants the whole tree in one place, use the browse page at `all-pages/`. The no-JavaScript baseline keeps that path visible in the sidebar links.
