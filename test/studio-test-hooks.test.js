import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 testHooksEnabled,
 mountStudioTestHooks,
 countDrumSourcesInTrace,
 setDrumGridCell,
} from '../src/studio-test-hooks.js';
import {defaultDrumSequence,validateDrumSequence} from '../src/drum-step-sequencer.js';
import {drumSequenceFromFixture} from '../src/drum-audio-fixture.js';

test('testHooksEnabled only with query flag',()=>{
 assert.equal(testHooksEnabled('?testHooks=1'),true);
 assert.equal(testHooksEnabled('?foo=1'),false);
 assert.equal(testHooksEnabled(''),false);
});

test('countDrumSourcesInTrace lists drum note-on lines',()=>{
 const snapshot={
  entries:[
   {type:'note-on',source:'drum:ch',note:42},
   {type:'note-on',source:'drum:kick',note:36},
   {type:'note-off',source:'drum:ch'},
  ],
 };
 const hits=countDrumSourcesInTrace(snapshot);
 assert.equal(hits.length,2);
 assert.equal(hits[0].source,'drum:ch');
});

test('mountStudioTestHooks loads validated drum sequence',()=>{
 const calls={render:0,set:null,panic:0};
 const studioTrace={snapshot:()=>({entries:[]})};
 const fixture=JSON.parse(
  readFileSync(new URL('./fixtures/drum-audio/ch-only-16.json',import.meta.url),'utf8'),
 );
 const hooks=mountStudioTestHooks({
  studioTrace,
  getSidReady:()=>true,
  validateDrumSequence,
  getDrumSequence:()=>calls.set??defaultDrumSequence(),
  setDrumSequence:seq=>{calls.set=seq},
  renderDrumPanel:()=>{calls.render++},
  triggerDrumLane:()=>{},
  drumStart:()=>{},
  drumStop:()=>{},
  getDrumRunning:()=>false,
  setMasterBpm:()=>{},
  panic:()=>{calls.panic++},
 });
 hooks.loadDrumSequence(drumSequenceFromFixture(fixture));
 assert.equal(calls.render,1);
 assert.equal(calls.set.grid[2].every(Boolean),true);
});

test('setDrumGridCell updates one step without mutating input',()=>{
 const seq=defaultDrumSequence();
 const next=setDrumGridCell(seq,'kick',1,true);
 assert.equal(next.grid[0][1],true);
 assert.equal(seq.grid[0][1],false);
});

test('mountStudioTestHooks setDrumCell can audition lane',()=>{
 let auditioned=null;
 const calls={render:0,seq:defaultDrumSequence()};
 const hooks=mountStudioTestHooks({
  studioTrace:{snapshot:()=>({entries:[]})},
  getSidReady:()=>true,
  validateDrumSequence,
  getDrumSequence:()=>calls.seq,
  setDrumSequence:seq=>{calls.seq=seq},
  renderDrumPanel:()=>{calls.render++},
  triggerDrumLane:lane=>{auditioned=lane},
  drumStart:()=>{},
  drumStop:()=>{},
  getDrumRunning:()=>false,
  setMasterBpm:()=>{},
  panic:()=>{},
 });
 hooks.setDrumCell('kick',3,true,{audition:true});
 assert.equal(auditioned,'kick');
 assert.equal(calls.seq.grid[0][3],true);
});

test('sid-studio exposes hooks when testHooks query is enabled',()=>{
 const src=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
 assert.match(src,/import \{[^}]*testHooksEnabled[^}]*\} from "\.\/studio-test-hooks\.js/);
 assert.match(src,/testHooksEnabled\(\)/);
 assert.match(src,/globalThis\.__project6581Test/);
});