import test from 'node:test';
import assert from 'node:assert/strict';
import {filterRegistersFromUi} from '../src/sid-filter-ui.js';

test('filterRegistersFromUi maps Hz and percent to SID units', () => {
  const regs=filterRegistersFromUi({cutoff:1050,resonance:17,volume:90,mode:'lowpass'});
  assert.equal(regs.cutoff,206);
  assert.equal(regs.resonance,3);
  assert.equal(regs.volume,14);
  assert.equal(regs.mode,'lowpass');
});