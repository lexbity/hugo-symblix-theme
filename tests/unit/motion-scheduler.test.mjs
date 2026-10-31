import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScheduler } from '../../assets/js/motion/scheduler.js';

function harness() {
  const queue = new Map(), hosts = new Set();
  let id = 0;
  const scheduler = createScheduler(() => hosts, {
    request(fn) { queue.set(++id, fn); return id; },
    cancel(key) { queue.delete(key); },
  });
  const step = (now) => {
    const entries = [...queue.entries()];
    queue.clear();
    for (const [, fn] of entries) fn(now);
  };
  return { queue, hosts, scheduler, step };
}

test('unready hosts are never framed and the last paused host stops RAF', () => {
  const h = harness();
  const host = { ready: false, lastFrameTime: null, frames: [],
    canFrame() { return this.ready; },
    frame(t, dt) { this.frames.push([t, dt]); this.lastFrameTime = t; },
  };
  h.hosts.add(host); h.scheduler.wake();
  assert.equal(h.queue.size, 0);
  host.ready = true;
  for (let i = 0; i < 10; i++) h.scheduler.wake();
  assert.equal(h.queue.size, 1);
  h.step(100); h.step(116);
  assert.deepEqual(host.frames, [[100, 0], [116, .016]]);
  host.ready = false; host.lastFrameTime = null;
  h.scheduler.reconcile(); assert.equal(h.queue.size, 0);
  host.ready = true; h.scheduler.reconcile(); h.step(20000);
  assert.equal(host.frames.at(-1)[1], 0);
});

test('seeded lifecycle load never schedules two RAFs or frames an ineligible host', () => {
  const h = harness();
  let seed = 104729;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const hosts = Array.from({length: 8}, () => ({
    ready: false, lastFrameTime: null, frames: 0,
    canFrame() { return this.ready; },
    frame(t, dt) {
      assert.equal(this.ready, true); assert.ok(dt >= 0 && dt <= .1);
      this.frames++; this.lastFrameTime = t;
    },
  }));
  hosts.forEach(host => h.hosts.add(host));
  for (let i = 0; i < 500; i++) {
    const host = hosts[random() % hosts.length];
    host.ready = !!(random() & 1);
    if (!host.ready) host.lastFrameTime = null;
    h.scheduler.reconcile(); h.scheduler.wake();
    assert.ok(h.queue.size <= 1);
    h.step(i * 17);
    assert.ok(h.queue.size <= 1);
  }
  hosts.forEach(host => { host.ready = false; });
  h.scheduler.reconcile(); assert.equal(h.queue.size, 0);
});

test('a host removing itself during a frame does not skip its sibling', () => {
  const h = harness(); let siblingFrames = 0;
  const a = { lastFrameTime: null, canFrame: () => h.hosts.has(a), frame() { h.hosts.delete(a); } };
  const b = { lastFrameTime: null, canFrame: () => true, frame() { siblingFrames++; } };
  h.hosts.add(a); h.hosts.add(b); h.scheduler.wake(); h.step(16);
  assert.equal(siblingFrames, 1); assert.equal(h.queue.size, 1);
  h.scheduler.stop(); assert.equal(h.queue.size, 0);
});
