import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransportState,applyTransportPatch,defaultTransport,arpTempo,arpStepMs,gameStepMs,withDrumTransport} from '../src/transport-state.js';
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

test('withDrumTransport overlays live rate, sync and local BPM on the pattern',()=>{
 const state=applyTransportPatch(defaultTransport(),{drum:{rate:8,sync:false,localBpm:140}});
 const seq=withDrumTransport({grid:['x'],rate:4,sync:true,localBpm:120},state);
 assert.deepEqual(seq,{grid:['x'],rate:8,sync:false,localBpm:140});
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
 assert.deepEqual(transport.getState(),{
  masterBpm:130,arp:{pattern:'updown',rate:2,sync:false,localBpm:90},
  game:{rate:8},drum:{rate:16,sync:false,localBpm:180}
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
