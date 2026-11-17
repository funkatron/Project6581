import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceRoutingState} from '../src/performance-routing-state.js';

function mockSelects(initial={keyboard:'sid1',arp:'sid1',game:'sid1'}){
  const els={};
  for(const [field,id] of Object.entries({keyboard:'keyboardRoute',arp:'arpRoute',game:'gameRoute'})){
    els[id]={value:initial[field],listeners:[],dispatchEvent(){for(const fn of this.listeners)fn()}};
    els[id].addEventListener=(type,fn)=>{if(type==='change')els[id].listeners.push(fn)};
  }
  const $=id=>els[id];
  return {$,els};
}

test('createPerformanceRoutingState mirrors selects and notifies',()=>{
  const {$}=mockSelects();
  let dirty=0;
  const routing=createPerformanceRoutingState($,{onChange:()=>dirty++});
  assert.equal(routing.keyboard,'sid1');
  assert.equal(routing.set({keyboard:'layer',arp:'all'}),true);
  assert.equal($('keyboardRoute').value,'layer');
  assert.equal(routing.arp,'all');
  assert.ok(dirty>=1);
});

test('applyFromPreset sets all three routes with change events',()=>{
  const {$}=mockSelects({keyboard:'sid2',arp:'sid2',game:'sid2'});
  const routing=createPerformanceRoutingState($);
  let changes=0;
  $('arpRoute').addEventListener('change',()=>changes++);
  routing.applyFromPreset({routing:{keyboard:'layer',arp:'layer',game:'sid1'}});
  assert.equal(routing.keyboard,'layer');
  assert.equal(routing.game,'sid1');
  assert.ok(changes>=1);
});