import test from 'node:test';
import assert from 'node:assert/strict';
import {sidSafeWaveByte, waveControlByte, validateVoiceWave} from '../src/sid-waveform.js';
import {SidRegisters} from '../src/sid-registers.js';

test('triangle+noise combines 6581 waveform bits', () => {
  assert.equal(waveControlByte('triangle+noise'), 0x10 | 0x80);
  assert.equal(validateVoiceWave('noise+triangle'), 'noise+triangle');
});

test('sid noteOn keeps the kick combination and plays a noise-first hat as noise', () => {
  assert.equal(sidSafeWaveByte('triangle+noise'), 0x10 | 0x80);
  assert.equal(sidSafeWaveByte('noise+triangle'), 0x80);
  const kickWrites = [];
  const kick = new SidRegisters((reg, value) => kickWrites.push([reg, value]));
  const kickSettings = {wave: 'triangle+noise', pulse: 50, attack: 0, decay: 0.21, sustain: 0.21, release: 0.02};
  kick.noteOn(0, 36, kickSettings);
  kick.noteOn(0, 36, kickSettings);
  const kickControl = kickWrites.filter((entry) => entry[0] === 4).map((entry) => entry[1]);
  assert.deepEqual(kickControl, [0x90, 0x91, 0x90, 0x91]);
  const writes = [];
  const sid = new SidRegisters((reg, value) => writes.push([reg, value]));
  sid.controls[0] = 0x91;
  sid.noteOn(0, 90, {wave: 'noise+triangle', pulse: 50, attack: 0, decay: 0.02, sustain: 0, release: 0.01});
  const controlWrites = writes.filter((entry) => entry[0] === 4).map((entry) => entry[1]);
  assert.deepEqual(controlWrites, [0x00, 0x80, 0x81]);
});