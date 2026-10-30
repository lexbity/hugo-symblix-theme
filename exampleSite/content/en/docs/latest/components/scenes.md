+++
title = "Scenes"
description = "Poster-first 3D and motion scene mounts with a vendored three.js runtime — the theme ships the stage, sites ship the scenes."
weight = 18
+++

The `scene` shortcode mounts an interactive 3D or motion scene — a WebGL
canvas driven by the theme's vendored three.js runtime — while remaining a
complete, static piece of content without JavaScript. The theme ships **the
stage, not the scenes**: you author a small scene module, the runtime owns
everything else (lifecycle, resizing, pausing, re-theming, failure
isolation).

Three guarantees come first:

1. **Poster-first.** Without JavaScript, under `prefers-reduced-motion`, in
   print, or when a scene fails, the mount shows your `poster` image with
   the overlay content. The scene is an enhancement of complete content,
   never a replacement for it.
2. **No layout shift.** The mount is sized entirely by CSS (`ratio` or
   `height`) before any script exists — scene loading cannot move the page.
3. **Same origin, zero external requests.** Scene modules and posters are
   site assets; URLs pointing off-origin fail the build.

## Usage

```
{{</* scene src="js/scenes/orbit.js"
           poster="/images/scene-orbit-poster.svg"
           title="Orbit — the reference demo scene" */>}}
**Real text above the scene.** The overlay is ordinary HTML — readable,
crawlable, and never rendered into the canvas.
{{</* /scene */>}}
```

{{< scene src="js/scenes/orbit.js" poster="/images/scene-orbit-poster.svg" title="Orbit — the reference demo scene" pointer="on" >}}
**Real text above the scene.** This overlay is ordinary HTML. The wireframe
icosahedron uses the active preset's accent color — switch presets in the
sidebar and watch it re-theme live. Scroll the page and the scene tilts
with scroll progress; move your cursor over the mount and the camera leans
toward it (the demo mounts `pointer="on"`).
{{< /scene >}}

## Parameters

| Param | Default | Description |
|---|---|---|
| `src` | — required | Site asset path of the scene ES module (below). Relative only; URL schemes and `//` fail the build. |
| `poster` | — required | Site asset path of the static frame shown without JS, under reduced motion, in print, and on scene failure. |
| `title` | — required | Accessible name — becomes the figure's `aria-label` and the poster's `alt`. |
| `runtime` | `three` | Adapter id. v1 ships `three`. |
| `load` | `visible` | Init strategy: start when the mount scrolls into view. |
| `pointer` | `off` | `on` delivers normalized pointer position to the scene (fine-pointer devices only). |
| `ratio` | `16/9` | Aspect ratio of the mount. Mutually exclusive with `height`. |
| `height` | — | Fixed CSS length instead of a ratio. |
| `class` | — | Extra classes on the mount. |

Invalid parameters are build errors, not silent fallbacks.

## The scene module contract

A scene is a dependency-free ES module in your site's `assets/js/scenes/`.
The runtime calls its default export once with a frozen context and expects
a small instance back. This is the entire API surface — the `orbit` demo
above is this exact code:

```js
export default function createScene(ctx) {
  const { THREE, canvas, gl, width, height, dpr, palette } = ctx;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 5);

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.accent.css),
    wireframe: true,
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), material);
  scene.add(mesh);

  return {
    frame(t, dt, s) {
      mesh.rotation.y += dt * 0.5;
      mesh.rotation.x = Math.sin(t * 0.0002) * 0.25 + s.scroll.progress * Math.PI;
      renderer.render(scene, camera);
    },
    onPaletteChange(p) {
      material.color.set(p.accent.css);
    },
    onResize(w, h, dpr) {
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(dpr);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
```

Contract rules:

- `THREE` arrives via `ctx` — do **not** bundle three into your scene (that
  would ship a second copy); the vendored runtime provides it.
- Use `ctx.gl` as the renderer's context (the runtime pre-creates it and
  uses the same context for feature detection and loss recovery).
- `frame(t, dt, signals)` is called per animation frame and **must** render.
  A throw permanently retires the scene for the page — the poster returns.
- `palette` is a frozen snapshot of the active preset's tokens
  (`accent`, `bg`, `surface`, `surface2`, `text`, `muted`, `border`), each
  with `css` (string) and `r/g/b` sRGB floats 0–1 (`null` for unparseable
  formats). `mode` is `"light"` or `"dark"`; `preset` is the preset id.

### Signals

| Signal | Shape | Notes |
|---|---|---|
| `signals.scroll` | `{ progress, velocity }` | Native scroll of the mount through the viewport, 0→1. Raw values — smooth them in your scene if you want. |
| `signals.pointer` | `{ x, y, active }` | `−1..1` from the mount's center; only armed with `pointer="on"` and on fine-pointer devices. Raw values — ease them in your scene, as the demo does. |

### Lifecycle

`data-scene-state` on the mount walks `idle → loading → live`, with `paused`
when scrolled away or the tab hides, and `error` when anything fails (a
throwing scene, missing WebGL2, a lost GPU context that cannot recover).
Errors are logged with the `[symblix-motion]` tag. A lost GPU context gets
exactly one automatic re-init; a second loss is permanent. The
[Scene Failure Fixtures](/en/docs/latest/components/scene-failures/) page
demonstrates the isolation live with deliberately broken scenes.

## Degradation matrix

| Condition | Result |
|---|---|
| No JavaScript | Poster + overlay; fully readable |
| `prefers-reduced-motion: reduce` | Runtime never starts — poster + overlay |
| No WebGL2 | `state=error`, poster + overlay |
| Scene throws / fails to load | `state=error`, poster + overlay, other scenes unaffected |
| Print | Canvas hidden, poster printed |

## Budgets

The motion runtime (theme-maintained, three.js included) is a separately
budgeted chunk fetched after page load, only on pages that use the
shortcode. See the README for the exact numbers; scene modules are site
content — keep each under ~50 KB and posters under ~200 KB.
