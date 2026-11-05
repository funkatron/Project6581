import test from 'node:test';
import assert from 'node:assert/strict';
import {UnisonSidController} from '../src/unison-sid-controller.js';
const sound={wave:'sawtooth',attack:.01,decay:.1,sustain:.8,release:.2,pulse:50};
const gateOns=writes=>writes.filter(([r,v])=>r%32<21&&r%32%7===4&&(v&1));
const gateOffs=writes=>writes.filter(([r,v])=>r%32<21&&r%32%7===4&&!(v&1));

test('eight unison layers sound across all three SID chips in Mono',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:8,unisonCount:8,mode:'mono',detune:30});
 const token=sid.noteOn(69,sound);
 assert.equal(gateOns(writes).length,8);
 assert.deepEqual([...new Set(gateOns(writes).map(([r])=>Math.floor(r/32)))],[0,1,2]);
 const offAt=writes.length;
 sid.noteOff(69,token);assert.equal(sid.current,null);assert.equal(gateOffs(writes.slice(offAt)).length,8);
});

test('six Voices and two Unison layers allow three Poly pitches',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:6,unisonCount:2,mode:'poly',detune:40});
 const owners=[60,64,67].map(n=>sid.noteOn(n,sound));
 assert.equal(sid.capacity,3);assert.equal(sid.polyNotes.size,3);
 assert.deepEqual([...sid.polyNotes.values()].map(x=>x.slots),[[0,1],[2,3],[4,5]]);
 assert.equal(gateOns(writes).length,6);
 sid.noteOff(64,owners[1]);assert.equal(sid.polyNotes.size,2);
 assert.deepEqual([...sid.polyNotes.keys()],[60,67]);
});

test('Duo steals the oldest complete stack and ignores its stale release',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:4,unisonCount:2,mode:'duo'});
 const first=sid.noteOn(60,sound);
 sid.noteOn(64,sound);
 const newer=sid.noteOn(67,sound);
 assert.deepEqual([...sid.polyNotes.keys()],[64,67]);
 assert.equal(sid.polyNotes.size,2);
 const before=writes.length;
 sid.noteOff(60,first);
 assert.equal(writes.length,before,'stolen note-off cannot silence replacement');
 sid.noteOff(67,newer);
 assert.deepEqual([...sid.polyNotes.keys()],[64]);
});

test('repeated pitches replace their ownership token without stopping a newer press',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:2,unisonCount:1,mode:'poly'});
 const old=sid.noteOn(60,sound),latest=sid.noteOn(60,sound);
 const prior=writes.length;
 sid.noteOff(60,old);
 assert.equal(writes.length,prior);
 assert.equal(sid.polyNotes.get(60).token,latest);
 sid.noteOff(60,latest);
 assert.equal(sid.polyNotes.size,0);
});

test('Legato changes pitch without resetting SID gates even on held-note fallback',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:3,unisonCount:2,mode:'legato'});
 const c=sid.noteOn(60,sound);
 assert.equal(gateOns(writes).length,2);
 const at=writes.length;
 const e=sid.noteOn(64,sound);
 assert.equal(gateOns(writes.slice(at)).length,0);
 assert.equal(gateOffs(writes.slice(at)).length,0);
 assert.ok(writes.slice(at).some(([r])=>r%32===0||r%32===7));
 const fallbackAt=writes.length;
 sid.noteOff(64,e);
 assert.equal(sid.current,60);
 assert.equal(gateOns(writes.slice(fallbackAt)).length,0);
 assert.equal(gateOffs(writes.slice(fallbackAt)).length,0);
 const offAt=writes.length;
 sid.noteOff(60,c);
 assert.equal(sid.current,null);
 assert.equal(gateOffs(writes.slice(offAt)).length,2);
});

test('Mono retriggers overlapping notes and safely returns to held pitch',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:2,unisonCount:2,mode:'mono'});
 const c=sid.noteOn(60,sound),e=sid.noteOn(64,sound);
 const at=writes.length;
 sid.noteOff(64,e);assert.equal(sid.current,60);
 assert.equal(gateOns(writes.slice(at)).length,2);
 sid.noteOff(60,c);assert.equal(sid.current,null);
});

test('Detune retunes active polyphonic stacks without restarting envelopes',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:6,unisonCount:2,mode:'poly',detune:10});
 sid.noteOn(60,sound);sid.noteOn(64,sound);
 const before=writes.length;
 sid.setLiveDetune(90);
 assert.equal(gateOns(writes.slice(before)).length,0);
 assert.equal(gateOffs(writes.slice(before)).length,0);
 assert.ok(writes.length>before);
 const next=writes.length;
 sid.setEnvelope({...sound,attack:.8,release:1.2});
 assert.equal(gateOns(writes.slice(next)).length,0);
 const envelopeSlots=new Set(writes.slice(next).filter(([r])=>[5,6,12,13,19,20].includes(r%32)).map(([r])=>r));
 assert.equal(envelopeSlots.size,8,'ADSR updates both registers for four active oscillators');
});

test('capacity respects full stacks and changes release active voices',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:3,unisonCount:2,mode:'duo'});
 assert.equal(sid.capacity,1);
 sid.noteOn(60,sound);sid.noteOn(64,sound);
 assert.deepEqual([...sid.polyNotes.keys()],[64]);
 sid.configure({unisonCount:1,mode:'poly'});
 assert.equal(sid.capacity,3);
 assert.equal(sid.polyNotes.size,0);
 sid.noteOn(69,sound);sid.panic();
 assert.equal(sid.polyNotes.size,0);
 assert.equal(sid.held.length,0);
});
