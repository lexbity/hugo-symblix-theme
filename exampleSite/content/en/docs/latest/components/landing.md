+++
title = "Landing"
description = "Hero, feature, and CTA primitives for high-impact landing pages."
weight = 14
+++

{{< hero eyebrow="Documentation landing" title="Build a stronger landing page" subtitle="Use a hero, feature grid, cards, and CTA blocks to turn documentation homepages into useful entry points." headingLevel="2" primaryHref="/en/docs/latest/getting-started/" primaryLabel="Start here" secondaryHref="/en/docs/latest/components/" secondaryLabel="See components" >}}
{{< /hero >}}

{{< feature-grid columns="3" >}}
{{< feature title="Hero" icon="sparkles" >}}
Lead with a focused title, subtitle, and clear actions.
{{< /feature >}}

{{< feature title="Feature grid" icon="blocks" >}}
Summarize what the documentation site supports.
{{< /feature >}}

{{< feature title="CTA" icon="compass" >}}
Close with a clear next step and a secondary path.
{{< /feature >}}
{{< /feature-grid >}}

## Media layout

Set `layout="media"` to give every tile a media band. Tiles with an `image`
render it flush to the tile edges; tiles with only an `icon` get a themed
glyph band that follows the active color preset.

{{< feature-grid layout="media" columns="3" >}}
{{< feature title="Versioned trees" icon="git-branch" eyebrow="Versioning" >}}
Keep current and archived releases navigable side by side.
{{< /feature >}}

{{< feature title="Translation aware" icon="languages" eyebrow="Languages" >}}
Switch languages with per-tree fallbacks and status warnings.
{{< /feature >}}

{{< feature title="Readable without JS" icon="zap" eyebrow="Static first" >}}
Everything from navigation to search fallback works as plain HTML.
{{< /feature >}}
{{< /feature-grid >}}

## Lead layout

Set `layout="lead"` for an asymmetric band: the first tile becomes a large
media feature spanning two columns, and the next two tiles stack beside it.

{{< feature-grid layout="lead" >}}
{{< feature title="Seven color presets" icon="sparkles" eyebrow="Visual identity" image="/images/landing-lead.svg" imageAlt="Abstract band of three preset swatch cards" >}}
Swap the whole palette — base colors, callouts, badges, syntax, and diagram
variants — through one token contract.
{{< /feature >}}

{{< feature title="Bundled fonts" icon="file-code" >}}
Inter and JetBrains Mono ship with the theme, self-hosted under the SIL OFL.
{{< /feature >}}

{{< feature title="Build-time diagrams" icon="layers" >}}
Mermaid sources render to static SVG in the pipeline, light and dark.
{{< /feature >}}
{{< /feature-grid >}}

{{< cta title="Ready to publish?" href="/en/docs/latest/all-pages/" label="Browse the docs" secondaryHref="/en/docs/latest/components/" secondaryLabel="Review components" >}}
Combine landing primitives to create a concise, navigable entry page.
{{< /cta >}}
