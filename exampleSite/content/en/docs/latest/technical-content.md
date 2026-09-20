+++
title = "Technical Content"
description = "A page that exercises prose, code, tables, blockquotes, and figures."
docType = "reference"
topics = ["layout", "content"]
tags = ["figures", "tables"]
weight = 15
+++

Technical documentation has to stay readable when it gets dense.

This page exists to exercise the content styling layer. It includes long prose,
inline code like `hugo --source exampleSite --theme hugo-theme-symblix`,
a blockquote, a code block, a table, and an image.

> Good docs optimize for scanning first and deep reading second.

Here is a fenced code sample:

```toml
[params.docs]
root = "docs"
```

And here is a wide table:

| Column A | Column B | Column C | Column D | Column E | Column F |
|---|---|---|---|---|---|
| One | Two | Three | Four | Five | Six |
| Alpha | Beta | Gamma | Delta | Epsilon | Zeta |

Here is the same image rendered through Markdown image syntax:

![A simple docs layout diagram](/images/docs-diagram.svg "Markdown image caption")

{{< figure src="/images/docs-diagram.svg" alt="A simple docs layout diagram" caption="Responsive images should stay within the prose column." >}}

The last paragraph is intentionally long to confirm the measure remains readable
and the content column does not over-expand on large screens.

See the [components index](/en/docs/latest/components/) for the component gallery.

## Hooked headings

Heading render hooks should preserve stable anchors and visible link targets.
See the [Hugo multilingual docs](https://gohugo.io/content-management/multilingual/) for a representative external link.
