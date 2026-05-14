+++
title = "Multilingual"
description = "Translate the docs tree and keep language-specific fallbacks clear."
related = ["/en/docs/latest/versioning/", "/en/docs/latest/getting-started/"]
weight = 50
+++

The theme is built around Hugo's multilingual mode.

## Language configuration

The example site defines each language in `exampleSite/hugo.toml`:

| Language | Locale | Direction |
| --- | --- | --- |
| English | `en-US` | `ltr` |
| French | `fr-FR` | `ltr` |
| Japanese | `ja-JP` | `ltr` |
| Arabic | `ar` | `rtl` |

## Content directories

Each language gets its own content root:

```txt
content/
  en/
  fr/
  ja/
  ar/
```

Use `defaultContentLanguageInSubdir = true` so translated URLs stay language-prefixed and predictable.

## Translation behavior

The docs shell shows translation warnings when a page is machine translated or incomplete. When a page does not exist in a target language, the theme can fall back to the equivalent page in the default language or to the version root.

{{< details title="What the example site demonstrates" open=true >}}
- `lang` and `dir` on the root `<html>`
- language switcher placement in the sidebar
- Arabic RTL layout and code blocks that remain LTR
- translation-aware page navigation
{{< /details >}}
