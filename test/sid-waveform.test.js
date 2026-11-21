import test from 'node:test';
import assert from 'node:assert/strict';
import {waveControlByte, validateVoiceWave, voiceWaveLabel} from '../src/sid-waveform.js';
import {SidRegisters} from '../src/sid-registers.js';

test('triangle+noise combines 6581 waveform bits', () => {
  assert.equal(waveControlByte('triangle+noise'), 0x10 | 0x80);
  assert.equal(validateVoiceWave('noise+triangle'), 'noise+triangle');
});

test('sid noteOn writes combined control register', () => {
  const writes = [];
  const sid = new SidRegisters((reg, value) => writes.push([reg, value]));
  sid.noteOn(0, 36, {wave: 'triangle+noise', pulse: 50, attack: 0, decay: 0.1, sustain: 0, release: 0.02});
  const gateOn = writes.find((entry) => entry[0] === 4 && entry[1] === (0x10 | 0x80 | 1));
  assert.ok(gateOn, 'expected gated combined waveform on voice 4');
});