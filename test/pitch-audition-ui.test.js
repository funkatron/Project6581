import test from 'node:test';
import assert from 'node:assert/strict';
import {createPitchAuditionUi,envelopeFromAuditionState} from '../src/pitch-audition-ui.js';

test('disabled audition maps to neutral preset envelope',()=>{
 assert.equal(envelopeFromAuditionState({enabled:false}).enabled,false);
 assert.equal(envelopeFromAuditionState().enabled,false);
});

test('enabled audition builds hold-ended two-point sweep',()=>{
 assert.deepEqual(envelopeFromAuditionState({enabled:true,start:-6,duration:80}).points,[
  {ms:0,semitones:-6},{ms:80,semitones:0}
 ]);
});

test('ui currentEnvelope tracks disabled default',()=>{
 const ui=createPitchAuditionUi();
 assert.equal(ui.currentEnvelope().enabled,false);
});
