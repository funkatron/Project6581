import test from 'node:test';
import assert from 'node:assert/strict';
import { probeSidPlayback } from '../scripts/sid-lab-playback-probe.mjs';

test('playback probe loads a SID, selects zero-based library subtune, and disposes', async () => {
  const calls = [];
  const result = await probeSidPlayback(new Uint8Array([80, 83, 73, 68]), {
    subtune: 2, seconds: 1,
    engineFactory: async () => ({
      loadSidBuffer: async bytes => calls.push(['load', bytes.length]),
      getTuneInfo: () => ({ songs: 3, title: 'Fixture' }),
      selectSong: async song => calls.push(['song', song]),
      renderSeconds: async seconds => {
        calls.push(['render', seconds]);
        return Int16Array.from([100, -100, 300, -300]);
      },
      getInstalledSids: () => 1,
      getSidStatus: () => Uint8Array.from([1, 2]),
      dispose: () => calls.push(['dispose']),
    }),
  });
  assert.equal(result.nonSilent, true);
  assert.equal(result.peak, 300);
  assert.equal(result.captureSupported, false);
  assert.deepEqual(result.finalRegisterSnapshots, [[1, 2]]);
  assert.deepEqual(calls, [
    ['load', 4], ['song', 1], ['render', 1], ['dispose'],
  ]);
});

test('playback probe disposes after a playback error', async () => {
  let disposed = false;
  await assert.rejects(probeSidPlayback(new Uint8Array(), {
    engineFactory: async () => ({
      loadSidBuffer: async () => { throw new Error('unsupported tune'); },
      dispose: () => { disposed = true; },
    }),
  }), /unsupported tune/);
  assert.equal(disposed, true);
});

test('playback probe enforces duration and subtune bounds', async () => {
  await assert.rejects(probeSidPlayback(new Uint8Array(), { seconds: 11 }), /duration/);
  await assert.rejects(probeSidPlayback(new Uint8Array(), { subtune: 0 }), /Subtune/);
});
