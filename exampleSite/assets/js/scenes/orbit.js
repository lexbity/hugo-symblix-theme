// Orbit — the reference demo scene for SYM-MOT-001 (site asset).
//
// This is the minimal valid scene from the theme docs, kept deliberately
// small: an accent-colored wireframe icosahedron that tumbles with time and
// re-themes live when the visitor switches color preset. Copy it as the
// starting point for your own scenes; it demonstrates every part of the
// scene contract (frame / onResize / onPaletteChange / dispose).

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
