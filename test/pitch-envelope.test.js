import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope,pitchOffsetAt} from '../src/pitch-envelope.js';

test('disabled pitch envelope leaves all notes unchanged',()=>{
 const e=validatePitchEnvelope({...DEFAULT_PITCH_ENVELOPE,points:[{ms:0,semitones:24}]});
 for(const ms of [0,1,100,10000])assert.equal(pitchOffsetAt(e,ms),0);
});
test('linear falling pitch follows millisecond breakpoints and returns to zero',()=>{
 const e=validatePitchEnvelope({enabled:true,interpolation:'linear',end:'zero',
  points:[{ms:0,semitones:24},{ms:40,semitones:-12}]});
 assert.equal(pitchOffsetAt(e,0),24);
 assert.equal(pitchOffsetAt(e,20),6);
 assert.equal(pitchOffsetAt(e,40),-12);
 assert.equal(pitchOffsetAt(e,41),0);
});
test('curved interpolation preserves endpoints and changes midpoint trajectory',()=>{
 const e=validatePitchEnvelope({enabled:true,interpolation:'curve',end:'hold',
  points:[{ms:0,semitones:12},{ms:100,semitones:0}]});
 assert.ok(pitchOffsetAt(e,25)>9);
 assert.equal(pitchOffsetAt(e,50),6);
 assert.equal(pitchOffsetAt(e,1000),0);
});
test('rejects invalid timing, range, and shape',()=>{
 const base={enabled:true,interpolation:'linear',end:'hold'};
 for(const points of [[],[{ms:1,semitones:0}],[{ms:0,semitones:0},{ms:0,semitones:1}],
  [{ms:0,semitones:49}],[{ms:0,semitones:NaN}],[{ms:0,semitones:0},{ms:10001,semitones:1}]])
  assert.throws(()=>validatePitchEnvelope({...base,points}));
 assert.throws(()=>validatePitchEnvelope({...base,interpolation:'cubic',points:[{ms:0,semitones:0}]}));
});
