// __asset.js — S4 capability proof (SYM-MOT-002 Q11/Q12, site asset).
//
// The first shipped scene that loads a real local asset: it fetches the
// fingerprinted model JSON through ctx.fetchAsset (allowlisted name, the
// generation's AbortSignal, same-origin credentials), parses it with the
// vendored three's ObjectLoader, and exposes `ready` so the runtime keeps
// the poster until the art is genuinely usable. Dispose ownership is
// registered with ctx.onDispose BEFORE the async continuation, so a
// partial construction can never leak. No bundled three, no external URL.

export default function createScene(ctx) {
  const { THREE, canvas, gl, width, height, dpr, palette } = ctx;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(dpr);
  ctx.onDispose(() => renderer.dispose());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0.45, 5.4);
  camera.lookAt(0, 0.15, 0);
  // The opaque copy panel shares the media row, so the useful view is the
  // band below it: frame the instrument into the box the static text leaves
  // behind (Q9), recomputed whenever the geometry changes.
  const root = new THREE.Group();
  scene.add(root);
  const VIEW_DISTANCE = 5.4;
  function layout() {
    const panel = ctx.mount.querySelector(".docs-scene__overlay");
    const boxH = ctx.mount.getBoundingClientRect().height || 1;
    const panelH = panel ? panel.getBoundingClientRect().height : 0;
    const center = Math.min(0.8, Math.max(0.5, (panelH + boxH) / (2 * boxH)));
    const visible = 2 * Math.tan((45 * Math.PI) / 360) * VIEW_DISTANCE;
    root.position.y = 0.15 - (center - 0.5) * visible - 0.05; // 0.05 ≈ model's own vertical center
    ctx.mount.__dbg = { panelH, boxH, center, rootY: root.position.y };
  }

  // Semantic roles: the preset drives meaning, not one flat accent.
  const roles = new Map([["core", "accent"], ["frame", "text"], ["dial", "muted"], ["ring", "surface2"]]);
  let model = null;
  let ring = null;
  let targetRotationY = 0;
  let baseRotationY = 0;

  function applyPalette(p) {
    if (!model) return;
    model.traverse((node) => {
      if (!node.material || !node.material.name) return;
      const role = roles.get(node.material.name);
      if (role && p[role]) node.material.color.set(p[role].css);
    });
  }
  applyPalette(palette);

  // DOM controls (keyboard accessible) - S8
  const controls = ctx.mount.parentElement?.querySelector('[data-scene-viewer-controls]') || document.querySelector('[data-scene-viewer-controls]');
  const statusEl = controls?.querySelector('[data-scene-viewer-status]') || null;
  const btnLeft = controls?.querySelector('[data-action="rotate-left"]') || null;
  const btnRight = controls?.querySelector('[data-action="rotate-right"]') || null;
  const btnReset = controls?.querySelector('[data-action="reset"]') || null;

  function announce(msg) {
    if (statusEl) {
      statusEl.textContent = msg;
    }
  }

  const onLeft = () => { targetRotationY -= Math.PI / 12; announce('Rotated left'); };
  const onRight = () => { targetRotationY += Math.PI / 12; announce('Rotated right'); };
  const onReset = () => { targetRotationY = baseRotationY; announce('Reset view'); };

  if (btnLeft) { btnLeft.addEventListener('click', onLeft); ctx.onDispose(() => btnLeft.removeEventListener('click', onLeft)); }
  if (btnRight) { btnRight.addEventListener('click', onRight); ctx.onDispose(() => btnRight.removeEventListener('click', onRight)); }
  if (btnReset) { btnReset.addEventListener('click', onReset); ctx.onDispose(() => btnReset.removeEventListener('click', onReset)); }

  const ready = ctx.fetchAsset("model")
    .then((response) => response.json())
    .then((json) => {
      // The factory is synchronous, but a retired generation may have
      // aborted this request already; check the signal before allocating.
      if (ctx.signal.aborted) return undefined;
      model = new THREE.ObjectLoader().parse(json);
      // Registered before the continuation ends: even if a later step
      // throws, every GPU resource created here is cleaned exactly once.
      // The model's disposal lives HERE only — not in dispose() as well
      // (one owner per resource, per the documented contract).
      ctx.onDispose(() => {
        model.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) node.material.dispose();
        });
        model = null;
      });
      ring = model.getObjectByName("ring");
      applyPalette(palette);
      root.add(model);
      layout();
      return undefined;
    });

  return {
    ready,
    frame(t, dt) {
      if (ring) ring.rotation.z += dt * 0.6;
      if (model) {
        baseRotationY = Math.sin(t * 0.0002) * 0.4;
        model.rotation.y = baseRotationY + targetRotationY;
      }
      renderer.render(scene, camera);
    },
    onPaletteChange(p) {
      applyPalette(p);
    },
    onResize(w, h, pixelRatio) {
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(pixelRatio);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      layout(); // the panel's share of the media row changes with width/zoom
    },
    // No dispose(): the renderer and the parsed model are already owned by
    // ctx.onDispose registrations, which cover partial construction too.
  };
}

createScene.api = 1;
