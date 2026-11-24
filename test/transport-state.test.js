import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransportState,applyTransportPatch,defaultTransport,arpTempo,arpStepMs,gameStepMs,drumSequence,activeNotes} from '../src/transport-state.js';
import {defaultSequence,sequenceForStyle} from '../src/game-step-sequencer.js';
import {defaultDrumSequence,validateDrumSequence} from '../src/drum-step-sequencer.js';
import {bindTransportDom,readTransportPatchFromDom,TRANSPORT_CONTROL_IDS} from '../src/transport-dom.js';
import {fakeDom} from './fixtures/fake-dom.mjs';

test('transport state is plain JSON-cloneable data with the HTML control defaults',()=>{
 const state=createTransportState().getState();
 assert.deepEqual(state,defaultTransport());
 assert.deepEqual(JSON.parse(JSON.stringify(state)),state);
});

test('transport modules never touch the DOM',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/transport-state.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/document|window|\$\(/);
});

test('invalid patch fields keep the previous value',()=>{
 const base=defaultTransport();
 const next=applyTransportPatch(base,{masterBpm:'300',arp:{rate:'3',sync:'yes',localBpm:'NaN'},drum:{rate:0}});
 assert.deepEqual(next,base);
 assert.equal(applyTransportPatch(base,{masterBpm:'95.6'}).masterBpm,96);
});

test('empty or unknown Root Arp order plays as Up',()=>{
 const base={...defaultTransport(),arp:{...defaultTransport().arp,pattern:'down'}};
 assert.equal(applyTransportPatch(base,{arp:{pattern:''}}).arp.pattern,'up');
 assert.equal(applyTransportPatch(base,{arp:{pattern:'sideways'}}).arp.pattern,'up');
 assert.equal(applyTransportPatch(base,{arp:{}}).arp.pattern,'down');
});

test('Root and Game Arp share the arp tempo but keep independent rates',()=>{
 const transport=createTransportState();
 transport.set({masterBpm:150,arp:{rate:2,sync:true,localBpm:60},game:{rate:8}});
 const state=transport.getState();
 assert.equal(arpTempo(state),150);
 assert.equal(arpStepMs(state),200);
 assert.equal(gameStepMs(state),50);
 transport.set({arp:{sync:false}});
 assert.equal(arpTempo(transport.getState()),60);
 assert.equal(gameStepMs(transport.getState()),125);
});

test('drumSequence() returns the live pattern in the preset shape',()=>{
 const grid=defaultDrumSequence().grid.map(row=>row.map(()=>false));
 grid[0][3]=true;
 const state=applyTransportPatch(defaultTransport(),{drum:{rate:8,sync:false,localBpm:140,grid}});
 const seq=drumSequence(state);
 assert.deepEqual(seq,{enabled:false,rate:8,sync:false,localBpm:140,steps:16,grid});
 assert.deepEqual(validateDrumSequence(seq),seq);
 seq.grid[0][3]=false;
 assert.equal(state.drum.grid[0][3],true,'detached copy');
});

test('the default transport drum grid is the factory house groove',()=>{
 assert.deepEqual(createTransportState().drumSequence,validateDrumSequence(defaultDrumSequence()));
});

test('setDrumGrid replaces only the grid and coerces it like validateDrumSequence',()=>{
 const transport=createTransportState();
 transport.set({drum:{rate:8}});
 const legacy=Array.from({length:6},(_,row)=>Array.from({length:16},(_,col)=>row===1&&col===4));
 transport.setDrumGrid(legacy);
 const seq=transport.drumSequence;
 assert.equal(seq.grid.length,4);
 assert.equal(seq.grid[1][4],true);
 assert.equal(seq.rate,8,'rate comes from its control, not the pattern');
 transport.setDrumGrid([[1]]);
 const coerced=transport.drumSequence.grid;
 assert.equal(coerced.length,4);
 assert.ok(coerced.every(row=>row.length===16&&row.every(cell=>typeof cell==='boolean')));
 assert.equal(coerced[0][0],true);
});

test('set notifies subscribers only on change, with a detached snapshot',()=>{
 const transport=createTransportState();
 const seen=[];
 transport.subscribe(state=>seen.push(state));
 assert.equal(transport.set({masterBpm:120}),false);
 assert.equal(transport.set({masterBpm:100}),true);
 seen[0].arp.rate=99;
 assert.equal(transport.arp.rate,1);
 assert.equal(seen.length,1);
});

test('bindTransportDom reads every control on mount and on input/change',()=>{
 const {$}=fakeDom({
  masterBpm:{value:'130'},arpPattern:{value:'updown'},arpRate:{value:'2'},arpSync:{checked:false},
  arpBpm:{value:'90'},gameRate:{value:'8'},drumRate:{value:'16'},drumSync:{checked:false},drumBpm:{value:'180'}
 });
 const transport=createTransportState();
 const binding=bindTransportDom($,transport);
 const state=transport.getState();
 const {grid:_grid,...drum}=state.drum;
 assert.deepEqual({masterBpm:state.masterBpm,arp:state.arp,gameRate:state.game.rate,drum},{
  masterBpm:130,arp:{pattern:'updown',rate:2,sync:false,localBpm:90,latch:false},
  gameRate:8,drum:{rate:16,sync:false,localBpm:180}
 });
 $('gameRate').value='32';$('gameRate').dispatch('change');
 assert.equal(transport.game.rate,32);
 $('masterBpm').value='200';$('masterBpm').dispatch('input');
 assert.equal(transport.masterBpm,200);
 // Preset load writes controls without events; readDom() catches up.
 $('arpRate').value='0.5';
 assert.equal(transport.arp.rate,2);
 binding.readDom();
 assert.equal(transport.arp.rate,0.5);
});

test('transport listener runs before later listeners on the same control',()=>{
 const {$}=fakeDom({arpRate:{value:'1'}});
 const transport=createTransportState();
 bindTransportDom($,transport);
 let seenByRestart=null;
 $('arpRate').addEventListener('change',()=>{seenByRestart=transport.arp.rate});
 $('arpRate').value='16';$('arpRate').dispatch('change');
 assert.equal(seenByRestart,16);
});

test('missing controls are skipped, not read as defaults',()=>{
 const patch=readTransportPatchFromDom(id=>id==='masterBpm'?{value:'99'}:null);
 assert.deepEqual(patch,{masterBpm:'99'});
 assert.equal(TRANSPORT_CONTROL_IDS.length,9);
});

test('the Game Arp phrase is validated, cloned on read and edited per step',()=>{
 const transport=createTransportState();
 assert.deepEqual(transport.sequence,defaultSequence());
 transport.sequence.steps[0].offset=5;
 assert.equal(transport.sequence.steps[0].offset,0,'reads are detached copies');
 transport.setSequence(sequenceForStyle('action'));
 assert.deepEqual(transport.sequence,sequenceForStyle('action'));
 transport.updateStep(1,{gate:false});
 assert.equal(transport.sequence.steps[1].gate,false);
 transport.setSequenceLength(4);
 assert.equal(transport.sequence.length,4);
 assert.throws(()=>transport.updateStep(0,{offset:99}),/pitch/);
 assert.throws(()=>transport.setSequenceLength(5),/length/);
 assert.equal(transport.sequence.steps[0].offset===99,false);
});

test('held and latched notes: press, release, latch capture and clears',()=>{
 const transport=createTransportState();
 assert.equal(transport.pressNote(60),true);
 assert.equal(transport.pressNote(60),false);
 transport.pressNote(64,{capture:true});
 assert.deepEqual(transport.held,[60,64]);
 assert.deepEqual(transport.latched,[64]);
 assert.equal(transport.isHeld(64),true);
 assert.equal(transport.releaseNote(60),true);
 assert.equal(transport.releaseNote(60),false);
 transport.releaseNote(64);
 transport.pressNote(67,{capture:true});
 assert.deepEqual(transport.latched,[67],'first key of a new chord replaces the latch');
 transport.pressNote(72);
 transport.latchHeld();
 assert.deepEqual(transport.latched,[67,72]);
 transport.clearHeld();
 assert.deepEqual(transport.getState().notes,{held:[],latched:[67,72]});
 transport.clearLatched();
 transport.pressNote(60);transport.set({notes:{latched:[61]}});
 transport.clearNotes();
 assert.deepEqual(transport.getState().notes,{held:[],latched:[]});
});

test('active notes come from the latched set only while Latch holds notes',()=>{
 const state=applyTransportPatch(defaultTransport(),{notes:{held:[60],latched:[64,67]}});
 assert.deepEqual(activeNotes(state),[60]);
 const latched=applyTransportPatch(state,{arp:{latch:true}});
 assert.deepEqual(activeNotes(latched),[64,67]);
 assert.deepEqual(activeNotes(applyTransportPatch(latched,{notes:{latched:[]}})),[60]);
});

test('note lists drop duplicates and out-of-range values',()=>{
 const state=applyTransportPatch(defaultTransport(),{notes:{held:[60,60,128,-1,61.5,'62',64]}});
 assert.deepEqual(state.notes.held,[60,64]);
});
