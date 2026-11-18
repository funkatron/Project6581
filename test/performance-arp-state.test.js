import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceArpState} from '../src/performance-arp-state.js';

function mockControls({gameOn=true}={}){
  const els={
    arpOn:{checked:false,listeners:[]},
    gameArpOn:{checked:gameOn,listeners:[]},
    arpLatch:{checked:false,listeners:[]}
  };
  for(const el of Object.values(els)){
    el.addEventListener=(type,fn)=>{if(type==='change')el.listeners.push(fn)};
    el.dispatchEvent=()=>{for(const fn of el.listeners)fn()};
  }
  const $=id=>els[id];
  return {$,els};
}

test('createPerformanceArpState mirrors DOM and notifies subscribers',()=>{
  const {$}=mockControls();
  const arp=createPerformanceArpState($);
  const seen=[];
  arp.subscribe(state=>seen.push({...state}));
  assert.equal(arp.gameOn,true);
  assert.equal(arp.set({rootOn:true}),true);
  assert.equal($('arpOn').checked,true);
  assert.equal(arp.rootOn,true);
  assert.equal(seen.at(-1).rootOn,true);
});

test('applyFromPreset updates slice without firing DOM change by default',()=>{
  const {$}=mockControls({gameOn:false});
  const arp=createPerformanceArpState($);
  let gameChanges=0;
  $('gameArpOn').addEventListener('change',()=>gameChanges++);
  arp.applyFromPreset({arp:{enabled:true,latch:true},game:{enabled:true}});
  assert.equal(arp.rootOn,true);
  assert.equal(arp.latchOn,true);
  assert.equal(arp.gameOn,true);
  assert.equal(gameChanges,0);
  arp.applyFromPreset({game:{enabled:false}},{emitChange:true});
  assert.equal(gameChanges,1);
});