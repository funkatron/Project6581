import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createTransportState,drumLaneAudible,drumSequence,applyTransportPatch,defaultTransport} from '../src/transport-state.js';
import {mountDrumPanel} from '../src/drum-panel-ui.js';
import {validateDrumKit,defaultDrumKit,DRUM_LANE_IDS} from '../src/drum-step-sequencer.js';
import {fakeDom,installFakeDocument} from './fixtures/fake-dom.mjs';

const audible=transport=>DRUM_LANE_IDS.filter(lane=>transport.drumLaneAudible(lane));

test('every lane plays by default',()=>{
 const transport=createTransportState();
 assert.deepEqual(transport.drum.mute,{kick:false,sn:false,ch:false,oh:false});
 assert.deepEqual(transport.drum.solo,{kick:false,sn:false,ch:false,oh:false});
 assert.deepEqual(audible(transport),DRUM_LANE_IDS);
});

test('mute silences a lane; solo plays only soloed lanes; mute still applies to a soloed lane',()=>{
 const transport=createTransportState();
 transport.setDrumMute('ch',true);
 assert.deepEqual(audible(transport),['kick','sn','oh']);
 transport.setDrumSolo('kick',true);
 assert.deepEqual(audible(transport),['kick']);
 transport.setDrumSolo('ch',true);
 assert.deepEqual(audible(transport),['kick'],'ch is soloed but muted');
 transport.setDrumMute('ch',false);
 assert.deepEqual(audible(transport),['kick','ch']);
 transport.setDrumSolo('kick',false);transport.setDrumSolo('ch',false);
 assert.deepEqual(audible(transport),DRUM_LANE_IDS);
});

test('patches merge per lane and ignore bad values',()=>{
 let state=applyTransportPatch(defaultTransport(),{drum:{mute:{sn:true}}});
 state=applyTransportPatch(state,{drum:{mute:{oh:true,cowbell:true,kick:'yes'},solo:'all'}});
 assert.deepEqual(state.drum.mute,{kick:false,sn:true,ch:false,oh:true});
 assert.deepEqual(state.drum.solo,{kick:false,sn:false,ch:false,oh:false});
 assert.equal(drumLaneAudible(state,'sn'),false);
 assert.equal(drumLaneAudible(state,'kick'),true);
});

test('grid edits, tempo changes and snapshots keep mute/solo; presets never see them',()=>{
 const transport=createTransportState();
 transport.setDrumSolo('sn',true);
 transport.setDrumGrid(Array.from({length:4},()=>Array(16).fill(true)));
 transport.set({masterBpm:128,drum:{rate:8}});
 assert.equal(transport.drum.solo.sn,true);
 const snapshot=transport.getState();
 snapshot.drum.solo.sn=false;
 transport.drum.mute.kick=true;
 assert.deepEqual(audible(transport),['sn'],'snapshots are copies');
 assert.deepEqual(Object.keys(drumSequence(transport.getState())).sort(),['enabled','grid','localBpm','rate','steps','sync']);
});

function mountPanel(transport){
 const restore=installFakeDocument();
 const {$}=fakeDom({drumGridScroller:{contains:()=>true}});
 let kit=validateDrumKit(defaultDrumKit());
 let changes=0;
 try{
  const ui=mountDrumPanel({
   $,help$:$,
   getDrumSequence:()=>transport.drumSequence,
   setDrumSequence:seq=>transport.setDrumGrid(seq.grid),
   getDrumKit:()=>kit,setDrumKit:next=>{kit=next},
   onPatternChange:()=>{changes++},
   getDrumMix:()=>{const {mute,solo}=transport.drum;return {mute,solo}},
   isLaneAudible:lane=>transport.drumLaneAudible(lane),
   setDrumMute:(lane,on)=>transport.setDrumMute(lane,on),
   setDrumSolo:(lane,on)=>transport.setDrumSolo(lane,on)
  });
  const all=[];
  const walk=node=>{all.push(node);for(const child of node.children??[])walk(child)};
  walk($('drumGrid'));
  const hasClass=(n,name)=>String(n.className??'').split(' ').includes(name);
  const buttons=all.filter(n=>hasClass(n,'drum-lane-ms-btn'));
  const cells=all.filter(n=>hasClass(n,'drum-cell'));
  const button=(lane,kind)=>buttons.find(b=>b.dataset.lane===lane&&b.dataset.kind===kind);
  return {ui,buttons,cells,button,restore,get changes(){return changes}};
 }catch(error){restore();throw error}
}

test('each lane, hats included, gets a small M and S toggle that drives the transport',()=>{
 const transport=createTransportState();
 const panel=mountPanel(transport);
 try{
  assert.deepEqual(panel.buttons.map(b=>b.dataset.lane+':'+b.textContent),
   ['kick:M','kick:S','sn:M','sn:S','ch:M','ch:S','oh:M','oh:S']);
  assert.equal(panel.button('oh','mute').getAttribute('aria-label'),'Mute OH');
  assert.ok(panel.buttons.every(b=>b.getAttribute('aria-pressed')==='false'));
  panel.button('sn','solo').dispatch('click');
  assert.equal(transport.drum.solo.sn,true);
  assert.equal(panel.button('sn','solo').getAttribute('aria-pressed'),'true');
  const silent=lane=>panel.cells.filter(c=>c.dataset.lane===lane).every(c=>c.classList.contains('is-silent'));
  assert.deepEqual(DRUM_LANE_IDS.map(silent),[true,false,true,true]);
  panel.button('sn','mute').dispatch('click');
  assert.deepEqual(DRUM_LANE_IDS.map(silent),[true,true,true,true]);
  panel.button('sn','solo').dispatch('click');
  panel.button('sn','mute').dispatch('click');
  assert.deepEqual(DRUM_LANE_IDS.map(silent),[false,false,false,false]);
  assert.equal(panel.changes,0,'mute/solo does not mark the preset as edited');
 }finally{panel.restore()}
});

test('a re-render keeps the buttons in step with the transport',()=>{
 const transport=createTransportState();
 transport.setDrumMute('kick',true);
 const panel=mountPanel(transport);
 try{
  assert.equal(panel.button('kick','mute').getAttribute('aria-pressed'),'true');
  assert.ok(panel.cells.filter(c=>c.dataset.lane==='kick').every(c=>c.classList.contains('is-silent')));
 }finally{panel.restore()}
});

test('without mix callbacks the panel renders no M/S buttons',()=>{
 const restore=installFakeDocument();
 try{
  const {$}=fakeDom({drumGridScroller:{contains:()=>true}});
  const transport=createTransportState();
  mountDrumPanel({$,help$:$,getDrumSequence:()=>transport.drumSequence,setDrumSequence:()=>{},
   getDrumKit:()=>validateDrumKit(defaultDrumKit()),setDrumKit:()=>{}});
  const text=JSON.stringify($('drumGrid'),(k,v)=>k==='parent'?undefined:v);
  assert.doesNotMatch(text,/drum-lane-ms/);
 }finally{restore()}
});

test('the drum sequencer drops silenced lanes before the hat choke picks a hat',()=>{
 const src=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
 assert.match(src,/resolveDrumHitsOnStep\(rawHits\.filter\(hit=>transport\.drumLaneAudible\(hit\.lane\)\)\)/);
});

test('lane heads have room for the M/S toggles, which never change size when pressed',()=>{
 const css=readFileSync(new URL('../src/seq-ui.css',import.meta.url),'utf8');
 assert.match(css,/\.drum-lane-head\{[^}]*min-width:clamp\(136px,19vw,172px\)/);
 assert.match(css,/\.drum-lane-ms-btn\{min-width:20px;height:20px;/);
 assert.doesNotMatch(css,/\.drum-lane-ms-btn[^{]*\[aria-pressed="true"\]\{[^}]*(width|height|padding|font)/);
});
