import test from 'node:test';
import assert from 'node:assert/strict';
import {clampVoiceCount,maxVoicesForEngines,requiredEnginePanels,createDefaultEngines,routeMask,routingKeyForSource,DEFAULT_ROUTING} from '../src/sid-engines.js';

test('dynamic voice cap follows enabled engine count',()=>{
 const engines=createDefaultEngines();
 engines[1].enabled=false;engines[2].enabled=false;
 assert.equal(maxVoicesForEngines(engines),3);
 engines[1].enabled=true;
 assert.equal(maxVoicesForEngines(engines),6);
 engines[2].enabled=true;
 assert.equal(maxVoicesForEngines(engines),9);
 assert.equal(clampVoiceCount(8,engines),8);
 assert.equal(clampVoiceCount(99,engines),9);
});

test('auto engine panels follow voice count',()=>{
 assert.equal(requiredEnginePanels(3),1);
 assert.equal(requiredEnginePanels(4),2);
 assert.equal(requiredEnginePanels(9),3);
});

test('route mask follows enabled engines and routing presets',()=>{
 const engines=createDefaultEngines();
 engines[2].enabled=false;
 assert.deepEqual(routeMask('all',engines),[0,1]);
 assert.deepEqual(routeMask('sid3',engines),[]);
 assert.deepEqual(routeMask('sid2',engines),[1]);
 assert.equal(routingKeyForSource('key:60'),'keyboard');
 assert.deepEqual(DEFAULT_ROUTING,{keyboard:'all',arp:'all',game:'sid1'});
});