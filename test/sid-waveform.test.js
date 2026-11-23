import test from 'node:test';
import assert from 'node:assert/strict';
import {sidSafeWaveByte, waveControlByte, validateVoiceWave, voiceWaveLabel} from '../src/sid-waveform.js';
import {SidRegisters} from '../src/sid-registers.js';

test('triangle+noise combines 6581 waveform bits', () => {
  assert.equal(waveControlByte('triangle+noise'), 0x10 | 0x80);
  assert.equal(validateVoiceWave('noise+triangle'), 'noise+triangle');
});

test('sid noteOn keeps a tonal kick and refuses a locked hat waveform', () => {
  assert.equal(sidSafeWaveByte('triangle+noise'), 0x10);
  assert.equal(sidSafeWaveByte('noise+triangle'), 0x80);
  const writes = [];
  const sid = new SidRegisters((reg, value) => writes.push([reg, value]));
  sid.noteOn(0, 90, {wave: 'noise+triangle', pulse: 50, attack: 0, decay: 0.02, sustain: 0, release: 0.01});
  const controlWrites = writes.filter((entry) => entry[0] === 4).map((entry) => entry[1]);
  assert.deepEqual(controlWrites, [0x80, 0x81]);
  sid.noteOn(0, 94, {wave: 'noise', pulse: 50, attack: 0, decay: 0.36, sustain: 0, release: 0.1});
  const second = writes.filter((entry) => entry[0] === 4).map((entry) => entry[1]);
  assert.deepEqual(second, [0x80, 0x81, 0x00, 0x80, 0x81]);
  assert.equal(second.includes(0x91), false);
});