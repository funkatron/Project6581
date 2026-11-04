import test from 'node:test';
import assert from 'node:assert/strict';
import {UnisonSidController} from '../src/unison-sid-controller.js';

const sound={wave:'sawtooth',attack:.01,decay:.1,sustain:.8,release:.2,pulse:50};
const gateWrites=writes=>writes.filter(([r])=>[4,11,18].includes(r%32));
const activeGates=writes=>gateWrites(writes).filter(([,value])=>value&1);

test('polyphonic notes occupy eight independent oscillator slots on three SID chips',()=>{
 const writes=[];
 const sid=new UnisonSidController((r,v)=>writes.push([r,v]),{unison:false,voiceCount:8,detune:50});
 for(let note=60;note<68;note++)sid.noteOn(note,sound);
 assert.equal(sid.polyNotes.size,8);
 assert.deepEqual([...sid.polyNotes.values()],[0,1,2,3,4,5,6,7]);
 assert.equal(activeGates(writes).length,8);
 assert.deepEqual([...new Set(activeGates(writes).map(([r])=>Math.floor(r/32)))],[0,1,2]);
 sid.noteOff(63);
 assert.equal(sid.polyNotes.has(63),false);
 assert.equal(sid.polyNotes.size,7);
 assert.equal(writes.at(-1)[0],32+4); // chip 1, voice 0
});

test('oldest polyphonic note is stolen and its late key-up cannot silence the replacement',()=>{
 const writes=[];
 const sid=new UnisonSidController((r,v)=>writes.push([r,v]),{unison:false,voiceCount:3});
 for(const note of [60,62,64])sid.noteOn(note,sound);
 const before=writes.length;
 sid.noteOn(65,sound);
 assert.deepEqual([...sid.polyNotes.entries()],[[62,1],[64,2],[65,0]]);
 const changed=writes.slice(before);
 assert.deepEqual(changed.filter(([r])=>r===4).map(([,v])=>v&1),[0,0,1]);
 const count=writes.length;
 sid.noteOff(60); // stolen physical key released later
 assert.equal(writes.length,count);
 assert.equal(sid.polyNotes.get(65),0);
 sid.noteOff(65);
 assert.equal(writes.at(-1)[0],4);
 assert.equal(writes.at(-1)[1]&1,0);
});

test('repeated polyphonic note retriggers the same oscillator without consuming a second slot',()=>{
 const writes=[];
 const sid=new UnisonSidController((r,v)=>writes.push([r,v]),{unison:false,voiceCount:4});
 sid.noteOn(60,sound);
 sid.noteOn(62,sound);
 const before=writes.length;
 sid.noteOn(60,sound);
 assert.deepEqual([...sid.polyNotes.entries()],[[62,1],[60,0]]);
 assert.equal(sid.polyNotes.size,2);
 assert.equal(writes.slice(before).filter(([r,v])=>r===4&&!(v&1)).length,2);
});

test('unison follows most recently held key and restores the previous note on release',()=>{
 const sid=new UnisonSidController(()=>{},{unison:true,voiceCount:5,detune:18});
 sid.noteOn(60,sound);sid.noteOn(64,sound);sid.noteOn(67,sound);
 assert.equal(sid.current,67);
 sid.noteOff(64);
 assert.equal(sid.current,67);
 sid.noteOff(67);
 assert.equal(sid.current,60);
 sid.noteOff(60);
 assert.equal(sid.current,null);
 assert.deepEqual(sid.held,[]);
});

test('switching unison and voice counts clears previous gates and note ownership',()=>{
 const writes=[];
 const sid=new UnisonSidController((r,v)=>writes.push([r,v]),{unison:false,voiceCount:8});
 for(let i=0;i<8;i++)sid.noteOn(60+i,sound);
 const count=writes.length;
 sid.configure({unison:true,voiceCount:3});
 assert.equal(sid.polyNotes.size,0);
 assert.equal(sid.current,null);
 assert.deepEqual(sid.held,[]);
 assert.equal(gateWrites(writes.slice(count)).filter(([,v])=>!(v&1)).length,8);
 sid.noteOn(72,sound);
 assert.equal(sid.current,72);
 assert.equal(activeGates(writes.slice(count)).length,3);
 sid.configure({unison:false,voiceCount:2});
 assert.equal(sid.current,null);
 assert.deepEqual(sid.held,[]);
 sid.noteOn(72,sound);sid.noteOn(74,sound);
 assert.deepEqual([...sid.polyNotes.values()],[0,1]);
 sid.panic();
 assert.equal(sid.polyNotes.size,0);
 assert.equal(sid.current,null);
});

test('pulse width updates address all selected chips without creating notes',()=>{
 const writes=[];
 const sid=new UnisonSidController((r,v)=>writes.push([r,v]),{unison:false,voiceCount:8});
 sid.setPulse(0,25);
 assert.equal(writes.length,16);
 assert.deepEqual([...new Set(writes.map(([r])=>Math.floor(r/32)))],[0,1,2]);
 assert.equal(sid.polyNotes.size,0);
});
