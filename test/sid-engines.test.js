import test from 'node:test';
import assert from 'node:assert/strict';
import {clampVoiceCount,maxVoicesForEngines,requiredEnginePanels,createDefaultEngines} from '../src/sid-engines.js';

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