import test from 'node:test';
import assert from 'node:assert/strict';
import { runSidLab } from '../scripts/sid-lab.mjs';

function sidFixture() {
  const bytes = new Uint8Array(0x7c + 4);
  const view = new DataView(bytes.buffer);
  bytes.set([80, 83, 73, 68]);
  view.setUint16(4, 2);
  view.setUint16(6, 0x7c);
  view.setUint16(8, 0x1000);
  view.setUint16(14, 1);
  view.setUint16(16, 1);
  bytes.set(new TextEncoder().encode('CLI fixture'), 0x16);
  return bytes;
}

test('CLI inspect renders human-readable SID metadata', async () => {
  const output = [];
  await runSidLab(['inspect', 'fixture.sid'], {
    read: async () => sidFixture(),
    write: line => output.push(line),
  });
  assert.match(output.join(''), /CLI fixture/);
  assert.match(output.join(''), /PSID v2/);
});

test('CLI inspect emits structured JSON', async () => {
  const output = [];
  await runSidLab(['inspect', 'fixture.sid', '--json'], {
    read: async () => sidFixture(),
    write: line => output.push(line),
  });
  assert.equal(JSON.parse(output[0]).loadAddress, 0x1000);
});

test('CLI analyze consumes register traces', async () => {
  const output = [];
  const input = [{ cycle: 0, chip: 0, register: 4, value: 0x21 }];
  await runSidLab(['analyze', 'events.json', '--json'], {
    read: async () => new TextEncoder().encode(JSON.stringify(input)),
    write: line => output.push(line),
  });
  assert.deepEqual(JSON.parse(output[0]).voices[0].noteOns, [0]);
});

test('CLI rejects unsupported arguments', async () => {
  await assert.rejects(runSidLab(['extract', 'tune.sid']), /Usage/);
  await assert.rejects(runSidLab(['inspect', 'tune.sid', '--unknown']), /Usage/);
});

test('CLI notes reports extracted note candidates', async () => {
  const output = [];
  const input = [
    { cycle: 0, chip: 0, register: 4, value: 0x21 },
    { cycle: 20, chip: 0, register: 4, value: 0x20 },
  ];
  await runSidLab(['notes', 'events.json', '--json'], {
    read: async () => new TextEncoder().encode(JSON.stringify(input)),
    write: line => output.push(line),
  });
  const result = JSON.parse(output[0]);
  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].endCycle, 20);
});
