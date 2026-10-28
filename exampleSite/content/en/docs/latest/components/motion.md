+++
title = "Motion"
description = "CSS-only front-page motion: pixel-dither hero glow, glyph stroke-draw, scroll reveals — no JavaScript, reduced-motion safe."
weight = 17
+++

Everything on this page is pure CSS. No JavaScript runs, no assets load, and
the zero-external-request contract holds. Three guarantees come first:

1. **Reduced motion is respected.** With `prefers-reduced-motion: reduce`,
   every theme animation and transition collapses to its final state
   instantly, and scroll-driven choreography is not applied at all — content
   is simply visible.
2. **Print freezes motion.** The print stylesheet suppresses all animation
   and transitions, so nothing prints half-faded.
3. **Motion never shifts layout.** All choreography animates `transform` and
   `opacity` only, so the theme's zero layout-shift behavior is unchanged.

## Pixel-dither hero glow

Set `variant="pixel"` on the `hero` shortcode to swap the smooth corner
gradient for a retro, Bayer-style quantized glow: a checkerboard pixel grid
masked by a stepped radial falloff, so the dither thins out toward the edge.
Two phase-shifted layers alternate in hard steps — a two-frame dither
shimmer in the tradition of demoscene graphics. The glow reads the active
preset's accent token, so it re-themes with all seven color presets, and it
keeps the default variant's physical top-right placement on RTL pages too,
matching the smooth glow it replaces.

{{< hero variant="pixel" eyebrow="Motion" title="A hero that hums" subtitle="This hero uses variant=\"pixel\". The glow is two masked pseudo-elements animating opacity only — GPU-composited, no repaint, no JavaScript." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

Browsers without `mask-composite` support render the default smooth glow
instead — the variant degrades, never breaks. The shimmer stops entirely
under reduced motion, and the glow layer never appears in print.

## Glyph stroke-draw

In `feature-grid layout="media"`, the themed glyph bands draw themselves in
once as they scroll into view — a one-time stroke animation driven by CSS
scroll-driven animations (`animation-timeline: view()`). Every shipped glyph
carries `pathLength="100"`, so a single keyframe fits every icon. Browsers
without scroll-driven animation support, and readers who prefer reduced
motion, see the finished glyphs immediately.

{{< feature-grid layout="media" columns="3" >}}
{{< feature title="Draws on arrival" icon="git-branch" eyebrow="Scroll-driven" >}}
Scroll these tiles out of view and back to replay the draw.
{{< /feature >}}

{{< feature title="One keyframe" icon="layers" eyebrow="Normalized" >}}
pathLength="100" makes every glyph's dash math identical.
{{< /feature >}}

{{< feature title="Static elsewhere" icon="zap" eyebrow="Fallback" >}}
No scroll-timeline support means no draw — just the finished icon.
{{< /feature >}}
{{< /feature-grid >}}

## Entrance and scroll reveals

On the front page (the `docs-home` layout only — reading pages stay quiet):

- **Hero entrance.** The hero's children rise in with a short stagger on
  load. Time-based, so it plays without scrolling and works everywhere.
- **Scroll reveals.** Feature tiles and cards below the fold rise in as
  they enter the viewport, scrubbed by scroll position rather than time.
  Gated on `animation-timeline: view()` support; other browsers render
  everything statically.

## Opt-in 3D tilt

Tiles and cards accept a `class` parameter. Adding `class="docs-motion-tilt"`
gives a hover-only, fixed-angle perspective tilt — CSS 3D transforms, no
pointer tracking, no JavaScript. It is suppressed under reduced motion.

{{< feature-grid columns="2" >}}
{{< feature title="Tilt on hover" icon="compass" eyebrow="CSS 3D" class="docs-motion-tilt" >}}
Hover this tile: a restrained rotateX/rotateY perspective shift.
{{< /feature >}}

{{< feature title="Your tiles stay calm" icon="book-open" eyebrow="Opt-in" >}}
Without the class, tiles keep the standard hover treatment.
{{< /feature >}}
{{< /feature-grid >}}

## What this is not

This tier adds identity and life without JavaScript, bytes on the wire, or
new dependencies — the theme ships zero scene content and zero runtimes.
Interactive 3D and heavier motion (the scaffolding-plus-runtime subsystem)
is a separate, opt-in design track with its own bundle budget.
