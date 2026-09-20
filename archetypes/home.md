---
title: "{{ or (replace .Name "-" " " | title) "Home" }}"
description: ""
---

<!-- Project front page scaffold — see the project component docs for the full parameter reference. -->

{{< hero eyebrow="Documentation" title="{{ or (replace .Name "-" " " | title) "Home" }}" subtitle="Replace this subtitle with a one-line project description." headingLevel="1" primaryHref="{{ printf "%s%s/" site.Home.RelPermalink (site.Params.docs.root | default "docs") }}" primaryLabel="Open the docs" >}}
{{< /hero >}}

{{< release version="v0.1.0" date="" href="https://example.com/your-project/releases" >}}

{{< install >}}
{{< install-method label="Homebrew" >}}brew install your-project{{< /install-method >}}

{{< install-method label="Script" >}}curl -fsSL https://example.com/your-project/install.sh | sh{{< /install-method >}}
{{< /install >}}

{{< downloads >}}
{{< download label="Linux x86_64" platform="linux" href="https://example.com/your-project-linux-amd64.tar.gz" checksum="https://example.com/your-project-linux-amd64.tar.gz.sha256" size="" primary="true" >}}

{{< download label="macOS arm64" platform="macos" href="https://example.com/your-project-darwin-arm64.tar.gz" size="" >}}

{{< download label="Windows x86_64" platform="windows" href="https://example.com/your-project-windows-x86_64.zip" size="" >}}
{{< /downloads >}}

{{< feature-grid >}}
{{< feature title="Feature one" icon="spark" >}}
Describe a headline capability.
{{< /feature >}}

{{< feature title="Feature two" icon="grid" >}}
Describe a second capability.
{{< /feature >}}

{{< feature title="Feature three" icon="arrow" >}}
Describe a third capability.
{{< /feature >}}
{{< /feature-grid >}}

{{< cards columns="3" >}}
{{< card title="Getting Started" href="{{ printf "%s%s/latest/getting-started/" site.Home.RelPermalink (site.Params.docs.root | default "docs") }}" icon="start" badge="Docs" >}}
Point to the first guide.
{{< /card >}}

{{< card title="Reference" href="{{ printf "%s%s/latest/reference/" site.Home.RelPermalink (site.Params.docs.root | default "docs") }}" icon="blocks" badge="Docs" >}}
Point to the reference pages.
{{< /card >}}

{{< card title="Components" href="{{ printf "%s%s/latest/components/" site.Home.RelPermalink (site.Params.docs.root | default "docs") }}" icon="browse" badge="Docs" >}}
Point to the component library.
{{< /card >}}
{{< /cards >}}