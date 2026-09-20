+++
title = "Getting Started"
description = "Install the project, understand the content tree, and build your first example."
related = ["/en/docs/latest/configuration/", "/en/docs/latest/navigation/"]
weight = 10
+++

Start here to confirm the documentation site is wired correctly and to understand the minimum content structure the theme expects.

## Installation

The example site runs from the repository root:

```bash
hugo server --source exampleSite --theme hugo-theme-symblix
```

You can also build the site without the live server:

```bash
npm run build
```

## Basic content structure

The theme is built around a simple Hugo tree:

```txt
content/
  en/
    docs/
      latest/
        _index.md
        getting-started.md
        configuration.md
        user-guide/
          _index.md
          writing-your-docs.md
```

Section pages such as `_index.md` create navigation groups. Regular Markdown pages become leaf nodes. The sidebar is generated from the content tree or from `data/docs_nav.yaml` when manual navigation is enabled.

## MkDocs-to-Hugo mapping

If you are coming from MkDocs, map the concepts like this:

| MkDocs | Hugo equivalent |
| --- | --- |
| `docs/index.md` | Section `_index.md` |
| Nested pages | Folders with `_index.md` and child pages |
| Nav file | Content tree or optional `data/docs_nav.yaml` |
| Markdown extensions | Hugo Markdown plus render hooks and shortcodes |

{{< note title="No-JS baseline" >}}
The final supported release keeps the documentation usable without JavaScript. Navigation, browsing, print output, and component examples are all static HTML.
{{< /note >}}
