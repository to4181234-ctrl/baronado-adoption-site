import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueGoCoinNotice, subscribeGoCoinNotices, clearGoCoinNotices
} from '../lib/goCoinNotices.js';

test('coin reward notices remain queued when a UI listener unmounts', () => {
  const oldWindow = globalThis.window;
  const callbacks = new Map();
  let nextId = 0;
  globalThis.window = {
    setTimeout(fn, delay) {
      assert.equal(delay, 1500);
      const id = ++nextId;
      callbacks.set(id, fn);
      return id;
    },
    clearTimeout(id) { callbacks.delete(id); }
  };
  try {
    const first = [];
    const unsubscribe = subscribeGoCoinNotices(value => first.push(value?.amount ?? null));
    assert.equal(enqueueGoCoinNotice(20), true);
    assert.equal(enqueueGoCoinNotice(30), true);
    assert.deepEqual(first, [null,20]);
    unsubscribe();
    const second=[];
    const unmountSecond=subscribeGoCoinNotices(value => second.push(value?.amount ?? null));
    assert.deepEqual(second,[20]);
    const timerId=[...callbacks.keys()][0];
    const callback=callbacks.get(timerId);
    callback();
    assert.deepEqual(second,[20,30]);
    assert.equal(enqueueGoCoinNotice(0),false);
    unmountSecond();
  } finally {
    clearGoCoinNotices();
    globalThis.window = oldWindow;
  }
});
