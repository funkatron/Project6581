import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceAllocator} from '../src/voice-allocator.js';
import {LiveSidController} from '../src/live-sid-controller.js';
const settings={wave:'pulse',pulse:50,attack:.01,decay:.1,sustain:.7,release:.2};
test('three slots only, oldest voice stolen deterministically',()=>{
 const a=new VoiceAllocator();assert.equal(a.on(60).voice,0);a.on(62);a.on(64);
 assert.deepEqual(a.on(65),{voice:0,retrigger:true,stolen:60});
 assert.equal(a.off(60),null);assert.equal(a.off(65),0);
});
test('duplicate note does not allocate or retrigger',()=>{
 const a=new VoiceAllocator();a.on(60);assert.deepEqual(a.on(60),{voice:0,retrigger:false,stolen:null});
});
test('note off only gates its allocated voice',()=>{
 const events=[];const c=new LiveSidController(e=>events.push(e));
 c.noteOn(60,settings);c.noteOn(62,settings);c.noteOff(60);
 assert.deepEqual(events.at(-1),{type:'write',register:4,value:0x40});
 assert.equal(c.noteOff(60),null);assert.equal(c.allocator.slots.filter(Boolean).length,1);
});
test('panic gates all occupied voices',()=>{
 const events=[];const c=new LiveSidController(e=>events.push(e));
 c.noteOn(60,settings);c.noteOn(62,settings);c.panic();
 assert.deepEqual(events.slice(-2).map(e=>e.register),[4,11]);
 assert.equal(c.allocator.slots.filter(Boolean).length,0);
});
