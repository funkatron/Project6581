import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_PATTERNS,selectRoot,patternPitch,stepMilliseconds} from '../src/arp-composition.js';

test('Arpeggiator root selection supports Up, Down, Up/Down and Random',()=>{
 const notes=[67,60,64];
 assert.deepEqual([0,1,2,3].map(step=>selectRoot(notes,'up',step)),[60,64,67,60]);
 assert.deepEqual([0,1,2,3].map(step=>selectRoot(notes,'down',step)),[67,64,60,67]);
 assert.deepEqual([0,1,2,3,4,5].map(step=>selectRoot(notes,'updown',step)),[60,64,67,64,60,64]);
 assert.equal(selectRoot(notes,'random',0,.99),67);
 assert.equal(selectRoot(notes,'random',0,0),60);
 assert.equal(selectRoot([],'up'),null);
});

test('Game Arp applies the selected pattern relative to every Arp root',()=>{
 for(const [style,offsets] of Object.entries(GAME_PATTERNS)){
  assert.deepEqual(offsets.map((_,step)=>patternPitch(60,style,step)),offsets.map(offset=>60+offset));
  assert.equal(patternPitch(64,style,0),64);
  assert.equal(patternPitch(64,style,offsets.length),64);
  assert.equal(patternPitch(126,style,1),127,'MIDI output must never exceed 127');
 }
 assert.equal(patternPitch(null,'action',0),null);
});

test('root and pattern clocks have independent, tempo-relative divisions',()=>{
 assert.equal(stepMilliseconds(120,1),500);
 assert.equal(stepMilliseconds(120,4),125);
 assert.equal(stepMilliseconds(120,8),62.5);
 assert.equal(stepMilliseconds(90,.5),60000/90/.5);
 assert.throws(()=>stepMilliseconds(0,4),RangeError);
 assert.throws(()=>stepMilliseconds(120,0),RangeError);
});
