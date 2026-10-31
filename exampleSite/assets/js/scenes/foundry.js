// Signal Foundry hero/narrative scene (SYM-MOT-002 S7, site-only original).
// Uses only documented API: ctx.THREE, signals, onResize, onPaletteChange, dispose, onDispose.

export default function createScene(ctx) {
  const { THREE, canvas, gl, width, height, dpr, palette } = ctx;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(dpr);
  ctx.onDispose(() => renderer.dispose());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0.6, 6);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  const matAccent = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.accent.css), metalness: 0.4, roughness: 0.3 });
  const matFrame = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.surface.css), metalness: 0.6, roughness: 0.25 });
  const matCore = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.text.css), metalness: 0.1, roughness: 0.5 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.12, 32), matFrame);
  base.position.y = -1.0;
  group.add(base);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 20), matFrame);
  column.position.y = -0.2;
  group.add(column);

  const module1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), matAccent);
  module1.position.set(-0.6, 0.3, 0);
  group.add(module1);

  const module2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), matCore);
  module2.position.set(0.5, 0.4, 0.2);
  group.add(module2);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 16, 40), matAccent);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  group.add(ring);

  function applyPalette(p) {
    matAccent.color.set(p.accent.css);
    matFrame.color.set(p.surface.css);
    matCore.color.set(p.text.css);
  }

  return {
    frame(t, dt, s) {
      const progress = s.scroll.progress || 0;
      module1.rotation.y += dt * 0.4;
      module2.rotation.x += dt * 0.3;
      ring.rotation.z += dt * 0.25;
      group.rotation.y = progress * Math.PI * 0.6 + (s.pointer.active ? s.pointer.x * 0.2 : 0);
      group.position.y = progress * 0.4 + (s.pointer.active ? -s.pointer.y * 0.15 : 0);
      renderer.render(scene, camera);
    },
    onResize(w, h, dpr) {
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(dpr);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    onPaletteChange(p) { applyPalette(p); },
    dispose() {
      [matAccent, matFrame, matCore].forEach(m => m.dispose());
      [base.geometry, column.geometry, module1.geometry, module2.geometry, ring.geometry].forEach(g => g.dispose());
    },
  };
}
createScene.api = 1;
