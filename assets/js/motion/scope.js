// Explicit ownership for DOM, observer, timer, and author resources.
export class ResourceScope {
  constructor(report = () => {}) {
    this.report = report;
    this.cleanups = [];
    this.closed = false;
  }

  own(cleanup) {
    if (typeof cleanup !== "function") throw new TypeError("cleanup must be a function");
    if (this.closed) this.run(cleanup);
    else this.cleanups.push(cleanup);
  }

  listen(target, type, callback, options) {
    if (this.closed) return;
    target.addEventListener(type, callback, options);
    this.own(() => target.removeEventListener(type, callback, options));
  }

  run(cleanup) {
    try { cleanup(); }
    catch (error) { this.report(error); }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    while (this.cleanups.length) this.run(this.cleanups.pop());
  }
}
