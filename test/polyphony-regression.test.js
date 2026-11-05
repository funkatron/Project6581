import test from 'node:test';
import assert from 'node:assert/strict';
import {UnisonSidController} from '../src/unison-sid-controller.js';

const sound={wave:'sawtooth',attack:.01,decay:.1,sustain:.8,release:.2,pulse:50};
const gateWrites=writes=>writes.filter(([r])=>[4,11,18].includes(r%32));
const activeGates=writes=>gateWrites(writes).filter(([,value])=>value&1);

test('Poly allocates eight independent oscillator slots on three SID chips',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{mode:'poly',voiceCount:8,unisonCount:1,detune:50});
 for(let note=60;note<68;note++)sid.noteOn(note,sound);
 assert.equal(sid.polyNotes.size,8);
 assert.deepEqual([...sid.polyNotes.values()].map(entry=>entry.index),[0,1,2,3,4,5,6,7]);
 assert.equal(activeGates(writes).length,8);
 assert.deepEqual([...new Set(activeGates(writes).map(([r])=>Math.floor(r/32)))],[0,1,2]);
 sid.noteOff(63);assert.equal(sid.polyNotes.has(63),false);assert.equal(sid.polyNotes.size,7);
 assert.equal(writes.at(-1)[0],32+4);
});

test('oldest Poly note is stolen and a late note-off cannot silence the replacement',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{mode:'poly',voiceCount:3,unisonCount:1});
 const old=sid.noteOn(60,sound);
 for(const note of [62,64])sid.noteOn(note,sound);
 const before=writes.length;
 sid.noteOn(65,sound);
 assert.deepEqual([...sid.polyNotes.entries()].map(([note,entry])=>[note,entry.index]),[[62,1],[64,2],[65,0]]);
 assert.deepEqual(writes.slice(before).filter(([r])=>r===4).map(([,v])=>v&1),[0,0,1]);
 const count=writes.length;
 sid.noteOff(60,old);assert.equal(writes.length,count);
 assert.equal(sid.polyNotes.get(65).index,0);
 sid.noteOff(65);assert.equal(writes.at(-1)[0],4);assert.equal(writes.at(-1)[1]&1,0);
});

test('repeated Poly note retriggers the same slot without consuming a new one',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{mode:'poly',voiceCount:4,unisonCount:1});
 sid.noteOn(60,sound);sid.noteOn(62,sound);
 const before=writes.length;sid.noteOn(60,sound);
 assert.deepEqual([...sid.polyNotes.entries()].map(([note,entry])=>[note,entry.index]),[[62,1],[60,0]]);
 assert.equal(sid.polyNotes.size,2);
 assert.equal(writes.slice(before).filter(([r,v])=>r===4&&!(v&1)).length,2);
});

test('Mono restores previous held note after releasing the newest',()=>{
 const sid=new UnisonSidController(()=>{},{mode:'mono',voiceCount:5,unisonCount:5,detune:18});
 sid.noteOn(60,sound);sid.noteOn(64,sound);sid.noteOn(67,sound);
 assert.equal(sid.current,67);sid.noteOff(64);assert.equal(sid.current,67);
 sid.noteOff(67);assert.equal(sid.current,60);
 sid.noteOff(60);assert.equal(sid.current,null);assert.deepEqual(sid.held,[]);
});

test('changing assignment, layers and Voices clears gates and previous ownership',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{mode:'poly',voiceCount:8,unisonCount:1});
 for(let i=0;i<8;i++)sid.noteOn(60+i,sound);
 const count=writes.length;
 sid.configure({mode:'mono',voiceCount:3,unisonCount:3});
 assert.equal(sid.polyNotes.size,0);assert.equal(sid.current,null);assert.deepEqual(sid.held,[]);
 assert.equal(gateWrites(writes.slice(count)).filter(([,v])=>!(v&1)).length,8);
 sid.noteOn(72,sound);assert.equal(sid.current,72);
 assert.equal(activeGates(writes.slice(count)).length,3);
 sid.configure({mode:'poly',voiceCount:2,unisonCount:1});
 assert.equal(sid.current,null);assert.deepEqual(sid.held,[]);
 sid.noteOn(72,sound);sid.noteOn(74,sound);
 assert.deepEqual([...sid.polyNotes.values()].map(entry=>entry.index),[0,1]);
 sid.panic();assert.equal(sid.polyNotes.size,0);assert.equal(sid.current,null);
});

test('live pulse width addresses only active oscillators, across all three chips',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{mode:'poly',voiceCount:8,unisonCount:1});
 for(let i=0;i<8;i++)sid.noteOn(60+i,sound);
 const before=writes.length;sid.setPulse(0,25);
 assert.equal(writes.length-before,16);
 assert.deepEqual([...new Set(writes.slice(before).map(([r])=>Math.floor(r/32)))],[0,1,2]);
 assert.equal(sid.polyNotes.size,8);
});
