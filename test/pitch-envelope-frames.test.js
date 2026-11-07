import test from 'node:test';
import assert from 'node:assert/strict';
import {startPitchEnvelope,pitchNoteAtFrame,sidFrequencyAtFrame} from '../src/pitch-envelope-frames.js';

const falling={enabled:true,interpolation:'linear',end:'hold',points:[{ms:0,semitones:24},{ms:100,semitones:0}]};

test('audio frame clock drives pitch regardless of browser time',()=>{
 const state=startPitchEnvelope(falling,48,4800,48000);
 assert.equal(pitchNoteAtFrame(state,4800),72);
 assert.equal(pitchNoteAtFrame(state,7200),60);
 assert.equal(pitchNoteAtFrame(state,9600),48);
 assert.equal(pitchNoteAtFrame(state,14400),48);
});

test('same elapsed time produces same pitch at different sample rates',()=>{
 const a=startPitchEnvelope(falling,48,0,48000);
 const b=startPitchEnvelope(falling,48,0,44100);
 assert.equal(pitchNoteAtFrame(a,2400),pitchNoteAtFrame(b,2205));
 assert.equal(sidFrequencyAtFrame(a,2400),sidFrequencyAtFrame(b,2205));
});

test('disabled pitch envelope leaves base note unchanged',()=>{
 const state=startPitchEnvelope({...falling,enabled:false},60,0,48000);
 assert.equal(pitchNoteAtFrame(state,4800),60);
});

test('SID frequency is bounded and note-on frame is validated',()=>{
 const state=startPitchEnvelope(falling,120,0,48000);
 assert.equal(sidFrequencyAtFrame(state,0),65535);
 assert.throws(()=>pitchNoteAtFrame(state,-1),RangeError);
 assert.throws(()=>startPitchEnvelope(falling,60,0,0),RangeError);
});
