// CI fixture (SYM-MOT-001 P6): a scene compiled against a future scene API
// — covers the declared-api mismatch check (Q15).
export default function createScene() {
  throw new Error("fixture: wrongapi scene never runs");
}
createScene.api = 99;
