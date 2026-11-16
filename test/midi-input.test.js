import test from 'node:test';
import assert from 'node:assert/strict';
import {createMidiInputController,midiOwnerKey} from '../src/midi-input.js';

let calls,keyDowns,keyUps,held;
const traceInput=(note,source,action,fn)=>{calls.push({note,source,action});return fn()};

test('MIDI does not keyUp a pitch still held from the keyboard',()=>{
 calls=[];keyDowns=[];keyUps=[];held=new Set([60]);
 const ctrl=createMidiInputController({
  traceInput,
  keyDown:n=>keyDowns.push(n),
  keyUp:n=>keyUps.push(n),
  pitchPhysicallyHeld:n=>held.has(n)
 });
 ctrl.onMidiMessage({data:new Uint8Array([0x90,60,100])});
 assert.deepEqual(keyDowns,[],'no duplicate keyDown');
 ctrl.onMidiMessage({data:new Uint8Array([0x80,60,0])});
 assert.deepEqual(keyUps,[],'keyboard still holds pitch');
});

test('MIDI note-off runs while input is blocked',()=>{
 calls=[];keyDowns=[];keyUps=[];
 let blocked=true;
 const ctrl=createMidiInputController({
  traceInput,
  keyDown:n=>keyDowns.push(n),
  keyUp:n=>keyUps.push(n),
  isBlocked:()=>blocked,
  pitchPhysicallyHeld:()=>false
 });
 blocked=false;
 ctrl.onMidiMessage({data:new Uint8Array([0x90,55,90])});
 assert.deepEqual(keyDowns,[55]);
 blocked=true;
 assert.equal(keyDowns.length,1,'note-on while blocked ignored');
 ctrl.onMidiMessage({data:new Uint8Array([0x90,55,90])});
 assert.deepEqual(keyDowns,[55]);
 ctrl.onMidiMessage({data:new Uint8Array([0x80,55,0])});
 assert.deepEqual(keyUps,[55],'note-off still runs when blocked');
});

test('sustain is per MIDI channel',()=>{
 calls=[];keyDowns=[];keyUps=[];
 const ctrl=createMidiInputController({
  traceInput,
  keyDown:n=>keyDowns.push(n),
  keyUp:n=>keyUps.push(n),
  pitchPhysicallyHeld:()=>false
 });
 ctrl.onMidiMessage({data:new Uint8Array([0x91,60,100])}); // ch 2
 ctrl.onMidiMessage({data:new Uint8Array([0x92,60,100])}); // ch 3 same pitch
 assert.deepEqual(keyDowns,[60,60]);
 ctrl.onMidiMessage({data:new Uint8Array([0xb1,64,127])}); // sustain ch 2
 ctrl.onMidiMessage({data:new Uint8Array([0x81,60,0])}); // off ch 2 deferred
 assert.deepEqual(keyUps,[]);
 ctrl.onMidiMessage({data:new Uint8Array([0x82,60,0])}); // off ch 3 immediate
 assert.deepEqual(keyUps,[60]);
 ctrl.onMidiMessage({data:new Uint8Array([0xb1,64,0])});
 assert.deepEqual(keyUps,[60,60]);
});

test('releaseAll drops every MIDI-driven note',()=>{
 keyUps=[];
 const ctrl=createMidiInputController({
  traceInput:(n,s,a,fn)=>fn(),
  keyDown:()=>{},
  keyUp:n=>keyUps.push(n),
  pitchPhysicallyHeld:()=>false
 });
 ctrl.onMidiMessage({data:new Uint8Array([0x90,40,100])});
 ctrl.onMidiMessage({data:new Uint8Array([0x91,41,100])});
 ctrl.releaseAll();
 assert.deepEqual(keyUps.sort(),[40,41]);
});

test('midiOwnerKey encodes channel and note',()=>{
 assert.equal(midiOwnerKey(2,60),'2:60');
});