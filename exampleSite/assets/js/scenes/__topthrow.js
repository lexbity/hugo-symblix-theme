// CI fixture (SYM-MOT-001 P6): a module that throws at import time —
// covers the runtime's modulePromise rejection path (ensureModule catch →
// fail), distinct from __broken.js which fails inside createScene.
throw new Error("fixture: module-level throw");
