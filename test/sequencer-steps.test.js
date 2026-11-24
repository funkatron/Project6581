import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arpStep,gameStep,drumStep} from '../src/sequencer-steps.js';
import {defaultSequence} from '../src/game-step-sequencer.js';
import {defaultDrumSequence} from '../src/drum-step-sequencer.js';

const clockA={step:0,root:null,last:null};

test('step logic has no DOM, timer or audio access',()=>{
 const source=readFileSync(new URL('../src/sequencer-steps.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/document|window|\$\(|setTimeout|setInterval|AudioContext|postMessage/);
});

test('arpStep does not mutate its inputs',()=>{
 const clock={step:2,root:60,last:60},notes=[60,64,67];
 arpStep(clock,{notes,pattern:'up'});
 assert.deepEqual(clock,{step:2,root:60,last:60});
 assert.deepEqual(notes,[60,64,67]);
});

test('Root Arp alone: releases the previous note, sounds the next and shows it',()=>{
 const first=arpStep(clockA,{notes:[60,64,67],pattern:'up'});
 assert.deepEqual(first.clock,{step:1,root:60,last:60});
 assert.deepEqual(first.events,[{type:'on',note:60,source:'arp'}]);
 assert.deepEqual(first.highlight,{root:60});
 assert.deepEqual(first.status,{type:'root',note:60,count:3});
 const second=arpStep(first.clock,{notes:[60,64,67],pattern:'up'});
 assert.deepEqual(second.events,[{type:'off',note:60,source:'arp'},{type:'on',note:64,source:'arp'}]);
 assert.deepEqual(second.clock,{step:2,root:64,last:64});
});

test('Root Arp follows the order and resolves through scale lock',()=>{
 const down=arpStep(clockA,{notes:[60,64,67],pattern:'down'});
 assert.equal(down.clock.root,67);
 const snapped=arpStep(clockA,{notes:[61],pattern:'up',resolve:note=>note-1});
 assert.deepEqual(snapped.events,[{type:'on',note:60,source:'arp'}]);
 assert.equal(snapped.status.note,60);
});

test('no notes: Root Arp alone releases its voice and clears the key; step does not advance',()=>{
 const result=arpStep({step:5,root:64,last:64},{notes:[],pattern:'up'});
 assert.deepEqual(result.clock,{step:5,root:null,last:null});
 assert.deepEqual(result.events,[{type:'off',note:64,source:'arp'}]);
 assert.deepEqual(result.highlight,{root:null});
 assert.deepEqual(result.status,{type:'idle'});
});

test('no notes with Game Arp on: root clears, nothing else changes',()=>{
 const result=arpStep({step:5,root:64,last:null},{notes:[],pattern:'up',gameOn:true});
 assert.deepEqual(result.clock,{step:5,root:null,last:null});
 assert.deepEqual(result.events,[]);
 assert.deepEqual(result.highlight,{});
});

test('with Game Arp on, Root Arp sounds nothing and moves the root only on a phrase boundary',()=>{
 const notes=[60,64];
 const first=arpStep(clockA,{notes,pattern:'up',gameOn:true,gameStep:3,phraseLength:4});
 assert.equal(first.clock.root,60,'first root is taken immediately');
 assert.deepEqual(first.events,[]);
 assert.deepEqual(first.highlight,{root:60});
 const mid=arpStep(first.clock,{notes,pattern:'up',gameOn:true,gameStep:5,phraseLength:4});
 assert.equal(mid.clock.root,60,'mid-phrase: root holds');
 assert.deepEqual(mid.highlight,{root:64},'the key still shows the arp position');
 const boundary=arpStep(mid.clock,{notes,pattern:'up',gameOn:true,gameStep:8,phraseLength:4});
 assert.equal(boundary.clock.root,60);
 const next=arpStep(boundary.clock,{notes,pattern:'up',gameOn:true,gameStep:12,phraseLength:4});
 assert.equal(next.clock.root,64);
});

function phrase(steps,length=16){
 const seq=defaultSequence();
 seq.length=length;
 steps.forEach((step,index)=>{seq.steps[index]={...seq.steps[index],...step}});
 return seq;
}

test('gameStep sounds root + offset and advances the step',()=>{
 const sequence=phrase([{offset:7,gate:true,duration:100}]);
 const result=gameStep({step:0,last:null},{root:60,sequence});
 assert.deepEqual(result.clock,{step:1,last:67});
 assert.deepEqual(result.events,[{type:'on',note:67,source:'game'}]);
 assert.equal(result.stepIndex,0);
 assert.deepEqual(result.highlight,{game:67});
 assert.deepEqual(result.status,{type:'note',index:0,root:60});
 assert.equal(result.gate,null);
});

test('gameStep releases the previous note first and wraps at the phrase length',()=>{
 const sequence=phrase([{offset:0,gate:true,duration:100}],4);
 const result=gameStep({step:4,last:62},{root:60,sequence});
 assert.equal(result.stepIndex,0);
 assert.deepEqual(result.events,[{type:'off',note:62,source:'game'},{type:'on',note:60,source:'game'}]);
});

test('a rest releases the previous note, sounds nothing and clears the key',()=>{
 const sequence=phrase([{gate:false}]);
 const result=gameStep({step:0,last:65},{root:60,sequence});
 assert.deepEqual(result.clock,{step:1,last:null});
 assert.deepEqual(result.events,[{type:'off',note:65,source:'game'}]);
 assert.deepEqual(result.highlight,{game:null});
 assert.deepEqual(result.status,{type:'rest',index:0});
 assert.equal(result.gate,undefined);
});

test('short steps ask for a gate at the step fraction',()=>{
 const sequence=phrase([{offset:0,gate:true,duration:25}]);
 assert.deepEqual(gameStep({step:0,last:null},{root:60,sequence}).gate,{note:60,fraction:0.25});
});

test('scale lock resolves the sounding note, and the gate releases that same note',()=>{
 const sequence=phrase([{offset:1,gate:true,duration:50}]);
 const result=gameStep({step:0,last:null},{root:60,sequence,resolve:note=>note===61?60:note});
 assert.deepEqual(result.events,[{type:'on',note:60,source:'game'}]);
 assert.equal(result.clock.last,60);
 assert.deepEqual(result.gate,{note:60,fraction:0.5});
});

test('no Game Arp root: stop, with the clock unchanged',()=>{
 const clock={step:3,last:60};
 const result=gameStep(clock,{root:null,sequence:defaultSequence()});
 assert.equal(result.stop,true);
 assert.equal(result.clock,clock);
 assert.deepEqual(result.events,[]);
});

test('drumStep returns the hits for the step and wraps after sixteen',()=>{
 const sequence=defaultDrumSequence();
 const first=drumStep({step:0},{sequence});
 assert.equal(first.index,0);
 assert.deepEqual(first.hits.map(hit=>hit.lane),['kick','ch']);
 assert.deepEqual(first.clock,{step:1});
 const last=drumStep({step:15},{sequence});
 assert.equal(last.index,15);
 assert.deepEqual(last.hits.map(hit=>hit.lane),['oh']);
 assert.deepEqual(last.clock,{step:0});
 assert.equal(drumStep({step:33},{sequence}).index,1);
});
