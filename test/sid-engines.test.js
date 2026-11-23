import test from 'node:test';
import assert from 'node:assert/strict';
import {clampVoiceCount,maxVoicesForEngines,createDefaultEngines,routeMask,routingKeyForSource,DEFAULT_ROUTING,MAX_SID_OSCILLATORS} from '../src/sid-engines.js';

test('voice cap is always nine oscillators across three chips',()=>{
 assert.equal(maxVoicesForEngines(),MAX_SID_OSCILLATORS);
 assert.equal(clampVoiceCount(8),8);
 assert.equal(clampVoiceCount(99),9);
 assert.equal(clampVoiceCount('2'),2);
});

test('route mask always addresses three chips for all and layer',()=>{
 assert.deepEqual(routeMask('all'),[0,1,2]);
 assert.deepEqual(routeMask('layer'),[0,1,2]);
 assert.deepEqual(routeMask('sid1'),[0]);
 assert.deepEqual(routeMask('sid2'),[1]);
 assert.deepEqual(routeMask('sid3'),[2]);
});

test('default routing keeps keyboard and arp on SID 1',()=>{
 assert.equal(routingKeyForSource('key:60'),'keyboard');
 assert.deepEqual(DEFAULT_ROUTING,{keyboard:'sid1',arp:'sid1',game:'sid1'});
});

test('default engine bank is SID 1–3 plus kick, snare, and cymbal chips',()=>{
 const engines=createDefaultEngines();
 assert.equal(engines.length,6);
 assert.equal(engines[3].outputBoostDb,24);
 assert.equal(engines[4].outputBoostDb,24);
 assert.equal(engines[5].outputBoostDb,24);
 assert.equal(engines[3].filter.mode,'lowpass');
 assert.equal(engines[4].filter.mode,'bandpass');
 assert.equal(engines[5].filter.mode,'highpass');
 assert.notEqual(engines[3].filter.cutoff,engines[4].filter.cutoff);
});