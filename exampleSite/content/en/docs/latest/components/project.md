+++
title = "Project front page"
description = "Release badges, install commands, and binary downloads for software project landing pages."
weight = 14
related = ["/en/docs/latest/components/landing/", "/en/docs/latest/components/tabs/"]
+++

{{< hero eyebrow="Project front page" title="Install, download, release" subtitle="Compose a software project landing page: a release badge, install commands, and binary downloads — all complete without JavaScript." headingLevel="2" primaryHref="/en/docs/latest/components/" primaryLabel="Back to components" secondaryHref="/en/docs/latest/components/landing/" secondaryLabel="See landing components" >}}
{{< /hero >}}

The project front page shortcodes turn a homepage into a software landing page: `release` shows the current version, `install` renders copyable install commands, and `downloads` lists binary artifacts.

## Release badge

{{< release version="v0.1.0" date="May 2026" href="https://github.com/lex/hugo-theme-symblix/releases" >}}

The `release` shortcode renders the latest version with an optional release date and changelog link. The version, date, label, and href are plain strings — they are HTML-escaped, so author input cannot inject markup.

| Param | Type | Required | Description |
|---|---|---|---|
| `version` | string | yes | Version string shown in the badge. Build fails if omitted. |
| `date` | string | no | Human-readable release date. |
| `href` | string | no | Changelog URL. http(s) and root-relative links are meaningful; unknown schemes are escaped. |
| `label` | string | no | Overrides the localized "Latest release" label. |

## Install commands

A single command needs no wrapper:

{{< install >}}brew install docworkbench{{< /install >}}

The `install` shortcode renders the command body as a copyable block. The command text is preserved exactly — interior whitespace, newlines, pipes, ampersands, and quotes survive — and the block carries the standard copy-to-clipboard contract as a JavaScript enhancement.

| Param | Type | Required | Description |
|---|---|---|---|
| `label` | string | no | Heading for the command block. Defaults to the localized "Install" label. |
| `id` | string | no | Anchor id for the container. |
| `class` | string | no | Extra classes for the container. |

Multi-line commands keep their interior indentation:

{{< install label="From script" >}}
curl -fsSL https://example.com/install.sh | sh
  && docworkbench --version
{{< /install >}}

Special characters are rendered literally — redirects, comparisons, and HTML-lookalikes never become markup:

{{< install label="Redirects and comparisons" >}}docworkbench render < input.md > output.html && diff <(docworkbench check < input.md) output.html{{< /install >}}

When the body contains two or more `install-method` blocks, the container renders as a tabbed switcher with keyboard and aria support:

{{< install >}}
{{< install-method label="Homebrew" >}}brew install docworkbench{{< /install-method >}}

{{< install-method label="Script" >}}curl -fsSL https://example.com/install.sh | sh{{< /install-method >}}
{{< /install >}}

Each `install-method` is a labeled panel carrying its own copyable command. Without JavaScript the panels stack in order, each with its label visible. With JavaScript the existing tabs enhancement builds the switcher: panels switch on click or arrow keys, with `aria-selected` and `aria-hidden` kept in sync.

| Param | Type | Required | Description |
|---|---|---|---|
| `label` | string | yes | Panel title shown in the switcher and the stacked list. Build fails if omitted. |
| `id` | string | no | Panel id used for the aria wiring. Defaults to a stable id derived from the label. |

Nested `install` inside a `tab` is not supported: the tab body passes content through markdown, which can reflow the command. Use `install-method` children for multiple commands instead.

## Downloads

{{< downloads >}}
{{< download label="Linux x86_64" platform="linux" href="https://github.com/lex/hugo-theme-symblix/releases/latest/download/docworkbench-linux-amd64.tar.gz" checksum="https://github.com/lex/hugo-theme-symblix/releases/latest/download/docworkbench-linux-amd64.tar.gz.sha256" size="4.2 MB" primary="true" >}}

{{< download label="macOS arm64" platform="macos" href="https://github.com/lex/hugo-theme-symblix/releases/latest/download/docworkbench-darwin-arm64.tar.gz" size="3.9 MB" >}}

{{< download label="Windows x86_64" platform="windows" href="https://github.com/lex/hugo-theme-symblix/releases/latest/download/docworkbench-windows-x86_64.zip" size="4.6 MB" >}}
{{< /downloads >}}

The `downloads` container wraps one or more `download` rows. Every row renders unconditionally — nothing is hidden, reordered, or filtered at render time. Rows with a known platform value carry the metadata used by the optional platform-detection enhancement; unknown values render as ordinary rows and never match detection. The container accepts `id` and `class`.

| Param | Type | Required | Description |
|---|---|---|---|
| `label` | string | yes | Row label shown as the download link. Build fails if omitted. |
| `href` | string | yes | Download URL. http(s) and root-relative links are meaningful; unknown schemes are escaped. |
| `platform` | string | no | One of `linux`, `macos`, `windows`. Other values render but never match detection. |
| `size` | string | no | Human-readable file size, shown as muted text. |
| `checksum` | string | no | URL of the checksum file, shown as a "sha256" link. |
| `primary` | bool | no | Emphasizes the recommended row. |
| `id` | string | no | Anchor id for the row. |
| `class` | string | no | Extra classes for the row. |

With JavaScript enabled, rows whose platform matches the visitor's system gain a "Suggested for your system" badge and accent emphasis. Detection reads standard user-agent platform hints only — nothing is stored, transmitted, or fingerprinted — and rows are never hidden, reordered, or removed. Without JavaScript, every row renders identically with no badge.

## Placeholder URLs

The release and download URLs in the demos use `https://github.com/lex/hugo-theme-symblix/...` as placeholders. Replace them with the real release URLs for your project — the release tag, asset names, and checksum path must point at artifacts your release process actually publishes.