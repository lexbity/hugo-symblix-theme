---
title: "Signal Foundry"
description: "Composed motion lab: hero assembly, native-scroll narrative, shader field, and an asset-backed instrument viewer."
type: showcase
---

## Signal Foundry

A composed demonstration of the Symblix motion stage using only the documented API. Read the narrative while the story track advances with native scroll, explore a palette-aware shader field, and inspect a local asset-backed instrument with keyboard controls. Everything remains usable as static HTML with posters and real specifications.

[Browse components](/en/docs/latest/components/) · [Scenes guide](/en/docs/latest/components/scenes/) · [Motion runtime](/en/docs/latest/components/motion/)

## Hero assembly

{{< scene src="js/scenes/foundry.js" poster="/images/scene-foundry-poster.svg" title="Signal Foundry hero assembly" height="26rem" pointer="on" >}}
**Signal Foundry** assembles sculptural modules in response to scroll and pointer. CTAs remain in ordinary HTML for full accessibility.
{{< /scene >}}

## Native-scroll narrative

{{< scene-track length="240vh" >}}
{{< scene src="js/scenes/foundry.js" poster="/images/scene-foundry-poster.svg" title="Signal Foundry narrative track" progress="track" height="24rem" pointer="on" >}}
**Assembly narrative.** As you scroll, the stage advances through distinct construction phases using track-derived progress. Native links, anchors, and keyboard scrolling remain unaffected.
{{< /scene >}}
{{< /scene-track >}}

Real narrative content follows in the document flow. The track reserves space for the sticky stage without intercepting input.

## Shader field

{{< scene src="js/scenes/field.js" poster="/images/scene-field-poster.svg" title="Palette-aware shader field" height="24rem" pointer="on" >}}
**Shader field.** An original fullscreen-quad shader reads theme tokens and pointer subtly, re-theming with presets. No external textures or network assets.
{{< /scene >}}

## Asset-backed instrument

{{< scene src="js/scenes/instrument.js" poster="/images/scene-asset-poster.svg" title="Local instrument viewer" height="26rem" assets="instrument" load="click" >}}
**Local instrument viewer.** Loads a small local JSON model via `ctx.fetchAsset` with `instance.ready`. Use the DOM controls below or the static specifications; keyboard and screen readers work without canvas hit-testing.
{{< /scene >}}

### Static specifications
- Parts: 6 meshes, 2 lights (local ObjectLoader JSON)
- Roles: frame/dial/core/ring with palette-aware materials
- Controls: rotate left/right, reset (DOM buttons), keyboard accessible
- Assets: fingerprinted, same-origin, no external textures/fonts
- Fallback: posters and this specification remain readable without WebGL
