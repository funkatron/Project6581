import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseHatLane,
  resolveDrumHitsOnStep,
  DRUM_SLOT,
  defaultDrumSlotForLane,
} from '../src/drum-voice-policy.js';
import {hitsOnStep, defaultDrumSequence} from '../src/drum-step-sequencer.js';

function hit(lane, laneIndex){
 return {lane,laneIndex};
}

test('chooseHatLane prefers closed hat when both fire',()=>{
 assert.equal(chooseHatLane(new Set(['ch','oh'])),'ch');
 assert.equal(chooseHatLane(new Set(['oh'])),'oh');
});

test('kick and sn always get dedicated slots',()=>{
 const resolved=resolveDrumHitsOnStep([hit('kick',0),hit('sn',1),hit('ch',2)]);
 assert.deepEqual(
  resolved.map(h=>[h.lane,h.slot]),
  [['kick',0],['sn',1],['ch',2]],
 );
});

test('open hat is dropped when closed hat is on the same step',()=>{
 const resolved=resolveDrumHitsOnStep([hit('kick',0),hit('oh',3),hit('ch',2)]);
 assert.equal(resolved.some(h=>h.lane==='oh'),false);
 assert.equal(resolved.find(h=>h.lane==='ch')?.slot,DRUM_SLOT.hat);
});

test('full four-lane step resolves to at most three voices',()=>{
 const resolved=resolveDrumHitsOnStep([
  hit('kick',0),hit('sn',1),hit('ch',2),hit('oh',3),
 ]);
 assert.equal(resolved.length,3);
 assert.deepEqual(resolved.map(h=>h.lane).sort(),['ch','kick','sn']);
});

test('four-on-floor step uses policy on sequence grid',()=>{
 const seq=defaultDrumSequence();
 seq.grid[0][0]=true;
 seq.grid[1][1]=true;
 seq.grid[2][0]=true;
 seq.grid[3][0]=true;
 const raw=hitsOnStep(seq,0);
 const resolved=resolveDrumHitsOnStep(raw);
 assert.deepEqual(raw.map(h=>h.lane).sort(),['ch','kick','oh']);
 assert.deepEqual(resolved.map(h=>h.lane).sort(),['ch','kick']);
});

test('defaultDrumSlotForLane maps hats to hat bus',()=>{
 assert.equal(defaultDrumSlotForLane('ch'),DRUM_SLOT.hat);
 assert.equal(defaultDrumSlotForLane('oh'),DRUM_SLOT.hat);
});