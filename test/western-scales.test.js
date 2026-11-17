import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
 SCALE_IDS,isPitchInScale,quantizeToScale,resolvePerformanceNote,scalePitchClasses
} from '../src/western-scales.js';

test('C major pitch classes',()=>{
 const classes=scalePitchClasses(0,'major');
 assert.equal(classes.size,7);
 assert.equal(isPitchInScale(60,{tonic:0,id:'major'}),true);
 assert.equal(isPitchInScale(61,{tonic:0,id:'major'}),false);
});

test('quantize snaps to nearest scale tone with lower tie-break',()=>{
 const state={tonic:0,id:'major',lock:true};
 assert.equal(quantizeToScale(61,state),60);
 assert.equal(quantizeToScale(62,state),62);
 assert.equal(quantizeToScale(63,state),62);
});

test('lock off leaves chromatic passes untouched',()=>{
 const state={tonic:0,id:'major',lock:false};
 assert.equal(resolvePerformanceNote(61,state),61);
});

test('chromatic scale never quantizes when locked',()=>{
 const state={tonic:0,id:'chromatic',lock:true};
 assert.equal(resolvePerformanceNote(61,state),61);
});

test('every scale id has at least three degrees',()=>{
 for(const id of SCALE_IDS){
  if(id==='chromatic')continue;
  const classes=scalePitchClasses(0,id);
  assert.ok(classes.size>=3,id);
 }
});

test('Game Arp offset example clamps after lock',()=>{
 const root=60;
 const raw=root+11;
 const locked=resolvePerformanceNote(raw,{tonic:0,id:'natural-minor',lock:true});
 assert.equal(isPitchInScale(locked,{tonic:0,id:'natural-minor'}),true);
});