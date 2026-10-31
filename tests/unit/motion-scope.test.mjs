import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ResourceScope } from '../../assets/js/motion/scope.js';

test('scope is LIFO, idempotent, and completes cleanup after a throw', () => {
  for (let cycle = 0; cycle < 50; cycle++) {
    const calls = [], errors = [];
    const scope = new ResourceScope((error) => errors.push(error));
    scope.own(() => calls.push('first'));
    scope.own(() => { calls.push('throw'); throw new Error('expected'); });
    scope.own(() => calls.push('last'));
    scope.close(); scope.close();
    assert.deepEqual(calls, ['last', 'throw', 'first']);
    assert.equal(errors.length, 1);
    scope.own(() => calls.push('late'));
    assert.equal(calls.at(-1), 'late');
    assert.equal(scope.cleanups.length, 0);
  }
});

test('owned listeners release exact callbacks/capture and reject late listeners', () => {
  const target = new EventTarget();
  let calls = 0;
  const scope = new ResourceScope();
  scope.listen(target, 'tick', () => calls++, { passive: true });
  target.dispatchEvent(new Event('tick'));
  scope.close();
  target.dispatchEvent(new Event('tick'));
  scope.listen(target, 'tick', () => calls++);
  target.dispatchEvent(new Event('tick'));
  assert.equal(calls, 1);
});
