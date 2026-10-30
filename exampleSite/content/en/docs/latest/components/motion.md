+++
title = "Motion"
description = "CSS-only front-page motion: eight hero glow variants, glyph stroke-draw, scroll reveals — no JavaScript, reduced-motion safe."
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

## Aurora hero glow

Set `variant="aurora"` for the organic counterpart to the pixel dither: two
soft accent lobes sway slowly around the hero's top-right corner like a slow
aurora. The whole effect is one pseudo-element animated with a single
`rotate()` — transform-only, GPU-composited, no repaint, no JavaScript — so
it renders in every browser that renders gradients at all. Like the pixel
glow it reads the active preset's accent token, keeps the default variant's
physical top-right placement on RTL pages, and collapses to the static
corner gradient under reduced motion and in print.

{{< hero variant="aurora" eyebrow="Motion" title="A glow that drifts" subtitle="This hero uses variant=\"aurora\". One pseudo-element, one rotate() — a slow sway around the corner, GPU-composited with zero repaints." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

## Scanline hero glow

Set `variant="scanline"` for a CRT-flavored sweep: a soft band of accent
sweeps down the corner glow like a monitor refresh, over a faint static
scanline texture fading out from the corner. The band travels by transform
only and rests fully above the card, so with motion disallowed nothing is
visible and the variant reads as a slightly cooler default glow.

{{< hero variant="scanline" eyebrow="Motion" title="A hero that refreshes" subtitle="This hero uses variant=\"scanline\". A transform-only band sweeps past the corner once every five seconds over a static CRT texture." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

## Pulse hero glow

`variant="pulse"` is the quietest option: the default corner gradient
breathes gently in opacity and scale. Its static state is pixel-identical
to the default variant, so it is the right choice when the glow should
live but never demand attention.

{{< hero variant="pulse" eyebrow="Motion" title="A hero that breathes" subtitle="This hero uses variant=\"pulse\". The default glow, breathing — opacity and scale only, frozen to the exact default look when motion is disallowed." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

## Beam hero glow

`variant="beam"` puts one soft ray of accent on a full 360° lighthouse
sweep around the corner — the same pivot geometry as the aurora sway with
linear timing, so the beam returns once per cycle. A dimmed static corner
gradient keeps the card warm between passes.

{{< hero variant="beam" eyebrow="Motion" title="A hero with a beacon" subtitle="This hero uses variant=\"beam\". One ray, one rotate(), a fourteen-second lighthouse cycle around the corner." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

## Dot-grid ripple hero glow

`variant="ripple"` lays a calm accent dot grid fading out from the corner
and sends a wave of brighter dots expanding outward from it — a sonar-style
pulse through the field. The wave is one pseudo-element: a dot grid masked
to an annulus around the corner, animated with scale and opacity only. With
motion disallowed the wave rests invisible, leaving the calm dot grid.

{{< hero variant="ripple" eyebrow="Motion" title="A hero in a dot field" subtitle="This hero uses variant=\"ripple\". A wave of brighter dots expands across the field every few seconds — scale and opacity only, no repaint." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

## Dot-grid ripple bounce hero glow

`variant="ripplebounce"` is the playful sibling of the ripple: the dot
field is cut into concentric rings around the top-right corner, and
adjacent rings breathe in opposite phase — the dots bounce radially, like
a slow wave rolling out of the corner. Two complementary ring layers do
the work with transform only, and with motion disallowed they rest
interleaved into one calm grid.

{{< hero variant="ripplebounce" eyebrow="Motion" title="A hero that bounces" subtitle="This hero uses variant=\"ripplebounce\". Concentric rings of dots around the corner breathe in opposite phase — transform only, one calm grid when motion is disallowed." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

## Synth oscilloscope hero glow

`variant="synth"` turns the hero into a quiet instrument: a faint scope
graticule with two dotted sine traces running the card's width, drifting at
different periods and speeds. Each trace is a row of tiled dot samples of
its waveform moved by exactly one pattern period per cycle, so the waves
propagate seamlessly — transform only, no repaint. With motion disallowed
the traces rest as static dotted waveforms.

{{< hero variant="synth" eyebrow="Motion" title="A hero on the scope" subtitle="This hero uses variant=\"synth\". Two dotted sine traces drift across a faint graticule at different periods — seamless loops, transform only." headingLevel="2" primaryHref="/en/docs/latest/components/landing/" primaryLabel="Hero parameters" secondaryHref="/en/docs/latest/customization/" secondaryLabel="Theme customization" >}}
{{< /hero >}}

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
