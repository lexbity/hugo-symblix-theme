// Palette-aware shader field (SYM-MOT-002 S7, site-only original). No textures.
export default function createScene(ctx) {
  const { THREE, canvas, gl, width, height, dpr, palette } = ctx;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(dpr);
  ctx.onDispose(() => renderer.dispose());

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
    uAccent: { value: new THREE.Color(palette.accent.css) },
    uBg: { value: new THREE.Color(palette.bg.css) },
    uPointer: { value: new THREE.Vector2(0, 0) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "void main(){gl_Position=vec4(position,1.0);}",
    fragmentShader: [
      "uniform float uTime;",
      "uniform vec2 uResolution;",
      "uniform vec3 uAccent;",
      "uniform vec3 uBg;",
      "uniform vec2 uPointer;",
      "void main(){",
      "  vec2 uv = gl_FragCoord.xy/uResolution;",
      "  vec2 p = uv*2.0-1.0;",
      "  p.x *= uResolution.x/uResolution.y;",
      "  float d = length(p - uPointer*0.4);",
      "  float v = 0.5 + 0.5*sin(d*6.0 - uTime*0.8) + 0.3*sin(p.x*4.0 + uTime*0.3);",
      "  vec3 col = mix(uBg, uAccent, clamp(v,0.0,1.0)*0.6);",
      "  gl_FragColor = vec4(col,1.0);",
      "}"
    ].join("\n")
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  return {
    frame(t, dt, s) {
      uniforms.uTime.value = t * 0.001;
      if (s.pointer.active) uniforms.uPointer.value.set(s.pointer.x, s.pointer.y);
      else uniforms.uPointer.value.set(0, 0);
      renderer.render(scene, camera);
    },
    onResize(w, h, dpr) {
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(dpr);
      uniforms.uResolution.value.set(w, h);
    },
    onPaletteChange(p) {
      uniforms.uAccent.value.set(p.accent.css);
      uniforms.uBg.value.set(p.bg.css);
    },
    dispose() {
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    },
  };
}
createScene.api = 1;
