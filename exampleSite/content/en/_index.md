+++
title = "Symblix"
description = "Versioned, multilingual Hugo documentation without JavaScript."
+++

{{< hero eyebrow="Documentation" title="Symblix" subtitle="Versioned, multilingual Hugo documentation without JavaScript." headingLevel="1" primaryHref="/en/docs/latest/" primaryLabel="Open the latest docs" secondaryHref="/en/docs/latest/components/" secondaryLabel="Browse components" >}}
{{< /hero >}}

{{< release version="v0.1.0" date="May 2026" href="https://github.com/lexbity/hugo-symblix-theme/releases" >}}

{{< install >}}
{{< install-method label="Homebrew" >}}brew install symblix{{< /install-method >}}

{{< install-method label="Script" >}}curl -fsSL https://example.com/install.sh | sh{{< /install-method >}}
{{< /install >}}

{{< downloads >}}
{{< download label="Linux x86_64" platform="linux" href="https://github.com/lexbity/hugo-symblix-theme/releases/latest/download/symblix-linux-amd64.tar.gz" checksum="https://github.com/lexbity/hugo-symblix-theme/releases/latest/download/symblix-linux-amd64.tar.gz.sha256" size="4.2 MB" primary="true" >}}

{{< download label="macOS arm64" platform="macos" href="https://github.com/lexbity/hugo-symblix-theme/releases/latest/download/symblix-darwin-arm64.tar.gz" size="3.9 MB" >}}

{{< download label="Windows x86_64" platform="windows" href="https://github.com/lexbity/hugo-symblix-theme/releases/latest/download/symblix-windows-x86_64.zip" size="4.6 MB" >}}
{{< /downloads >}}

{{< feature-grid >}}
{{< feature title="Versioned docs" icon="versions" >}}
Keep current and archived documentation in one site.
{{< /feature >}}

{{< feature title="Multilingual" icon="languages" >}}
Support translated docs with clear review metadata.
{{< /feature >}}

{{< feature title="No JavaScript" icon="static" >}}
Readable HTML, durable navigation, and print-friendly output.
{{< /feature >}}
{{< /feature-grid >}}

{{< cards columns="3" >}}
{{< card title="Getting Started" href="/en/docs/latest/getting-started/" icon="start" badge="Docs" >}}
Start with the installation and content tree overview.
{{< /card >}}

{{< card title="Theme Guide" href="/en/docs/latest/" icon="browse" badge="Docs" >}}
Read the theme documentation from the latest release root.
{{< /card >}}

{{< card title="Components" href="/en/docs/latest/components/" icon="blocks" badge="Docs" >}}
See the shortcode and render-hook examples in one place.
{{< /card >}}
{{< /cards >}}