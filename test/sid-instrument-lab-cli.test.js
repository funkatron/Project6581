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

test('CLI capture delegates to backend and emits reusable trace envelope', async () => {
  const output = [];
  let requested;
  await runSidLab(['capture', 'fixture.sid', '--backend', '/trusted/player', '--subtune', '1', '--json'], {
    read: async () => sidFixture(),
    write: line => output.push(line),
    backendFactory: executable => {
      assert.equal(executable, '/trusted/player');
      return { capture: async request => {
        requested = request;
        return { events: [{ cycle: 1, chip: 0, register: 4, value: 0x21 }] };
      } };
    },
  });
  assert.equal(requested.subtune, 1);
  assert.equal(JSON.parse(output[0]).events.length, 1);
});

test('CLI analyze accepts captured trace envelopes', async () => {
  const output = [];
  await runSidLab(['analyze', 'capture.json', '--json'], {
    read: async () => new TextEncoder().encode(JSON.stringify({
      schemaVersion: 1, events: [{ cycle: 0, chip: 0, register: 4, value: 0x21 }],
    })),
    write: line => output.push(line),
  });
  assert.equal(JSON.parse(output[0]).voices[0].noteOns.length, 1);
});

test('CLI capture requires an explicit backend executable', async () => {
  await assert.rejects(runSidLab(['capture', 'fixture.sid']), /Usage/);
});

test('CLI wav writes rendered audio with configurable chip and voice', async () => {
  const saved = [];
  const output = [];
  await runSidLab(['wav', 'trace.json', '--out', 'tone.wav', '--wasm', 'sid.wasm', '--chip', '1', '--voice', '2'], {
    read: async filename => filename === 'sid.wasm'
      ? new Uint8Array([0, 97, 115, 109])
      : new TextEncoder().encode(JSON.stringify({ events: [], maxCycles: 100 })),
    save: async (filename, bytes) => saved.push([filename, bytes]),
    write: line => output.push(line),
    wavRenderer: async (_wasm, events, options) => {
      assert.deepEqual(events, []);
      assert.deepEqual(options, { chip: 1, voice: 2, endCycle: 100 });
      return { wav: Uint8Array.from([82, 73, 70, 70]), frames: 0, sampleRate: 48000 };
    },
  });
  assert.equal(saved[0][0], 'tone.wav');
  assert.equal(saved[0][1].length, 4);
  assert.match(output[0], /Wrote tone.wav/);
});
