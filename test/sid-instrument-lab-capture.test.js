import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureSidRegisters, MAX_SID_BYTES,
} from '../src/features/sid-instrument-lab/capture-sid-registers.js';

function sidFixture() {
  const bytes = new Uint8Array(0x7c + 4);
  const view = new DataView(bytes.buffer);
  bytes.set([80, 83, 73, 68]);
  view.setUint16(4, 2);
  view.setUint16(6, 0x7c);
  view.setUint16(8, 0x1000);
  view.setUint16(14, 2);
  view.setUint16(16, 1);
  return bytes;
}

test('passes validated subtune and budgets to backend', async () => {
  let options;
  const backend = { capture: async input => {
    options = input;
    return { events: [{ cycle: 12, chip: 0, register: 4, value: 0x21 }] };
  } };
  const result = await captureSidRegisters(backend, sidFixture(), { subtune: 2, maxCycles: 100 });
  assert.equal(options.subtune, 2);
  assert.equal(options.maxCycles, 100);
  assert.equal(result.events[0].cycle, 12);
  assert.equal(result.source.subtune, 2);
});

test('rejects invalid subtunes, files, and backend contracts', async () => {
  const backend = { capture: async () => ({ events: [] }) };
  await assert.rejects(captureSidRegisters({}, sidFixture()), /capture/);
  await assert.rejects(captureSidRegisters(backend, sidFixture(), { subtune: 3 }), /Subtune/);
  await assert.rejects(captureSidRegisters(backend, new Uint8Array(MAX_SID_BYTES + 1)), /limit/);
  await assert.rejects(captureSidRegisters(backend, sidFixture(), { maxCycles: 0 }), /budget/);
});

test('rejects backend traces exceeding requested cycle budget', async () => {
  const backend = { capture: async () => ({
    events: [{ cycle: 101, chip: 0, register: 4, value: 1 }],
  }) };
  await assert.rejects(captureSidRegisters(backend, sidFixture(), { maxCycles: 100 }), /budget/);
});

test('supports abort before capture begins', async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  const backend = { capture: async () => { called = true; return { events: [] }; } };
  await assert.rejects(captureSidRegisters(backend, sidFixture(), { signal: controller.signal }));
  assert.equal(called, false);
});

test('rejects invalid backend output', async () => {
  const backend = { capture: async () => ({ events: 'invalid' }) };
  await assert.rejects(captureSidRegisters(backend, sidFixture()), /invalid event trace/);
});
