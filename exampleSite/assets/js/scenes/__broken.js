// CI fixture (SYM-MOT-001): a scene whose createScene throws, proving the
// runtime's one-strike error isolation (state=error, poster intact, other
// scenes unaffected). Used by the draft fixture page scene-fixture.md.
export default function createScene() {
  throw new Error("fixture: createScene intentionally throws");
}
