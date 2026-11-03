import test from 'node:test';
import assert from 'node:assert/strict';
import {UnisonSidController} from '../src/unison-sid-controller.js';
const sound={wave:'sawtooth',attack:.01,decay:.1,sustain:.8,release:.2,pulse:50};
test('eight unison oscillators use all three SID chips',()=>{
 const writes=[];const sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:8,detune:30});
 sid.noteOn(69,sound);
 const gates=writes.filter(([r,v])=>r%32<21&&r%32%7===4&&(v&1));
 assert.equal(gates.length,8);
 assert.deepEqual([...new Set(gates.map(([r])=>Math.floor(r/32)))],[0,1,2]);
 sid.noteOff(69);
 assert.equal(sid.current,null);
});
test('detune spreads oscillator frequency symmetrically',()=>{
 const frequency=(detune)=>{const writes=[];new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:3,detune}).noteOn(69,sound);return [0,7,14].map(base=>writes.findLast(([r])=>r===base+1)[1]*256+writes.findLast(([r])=>r===base)[1])};
 const values=frequency(50);assert.ok(values[0]<values[1]&&values[1]<values[2]);
 assert.equal(new Set(frequency(0)).size,1);
});
test('voice count is clamped and panic clears notes',()=>{
 const sid=new UnisonSidController(()=>{});
 sid.configure({voiceCount:99});
 assert.equal(sid.voiceCount,8);
 sid.noteOn(60,sound);sid.panic();assert.equal(sid.current,null);assert.equal(sid.held.length,0);
});
