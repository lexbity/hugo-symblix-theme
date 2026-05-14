+++
title = "Code Blocks"
description = "Render readable fenced code with titles and filenames."
docType = "reference"
topics = ["code", "render-hooks"]
tags = ["code", "render-hooks"]
weight = 15
+++

The code block render hook keeps examples readable in static HTML and in print.

## Basic example

```bash
hugo server --source exampleSite --theme hugo-theme-docworkbench
```

## With metadata

```toml
[params.docs]
root = "docs"
```

The render hook supports a title and filename caption through fenced-code attributes:

```toml {title="exampleSite/hugo.toml" filename="exampleSite/hugo.toml"}
[params.docs]
root = "docs"
```

## What is not here

{{< warning title="Static output only" >}}
The release build does not include copy-code buttons or a JavaScript clipboard helper. The rendered HTML must remain useful without any runtime enhancement.
{{< /warning >}}
