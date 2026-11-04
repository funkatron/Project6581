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

test('live detune retunes active unison voices without interrupting held notes',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:3,detune:10,unison:true});
 sid.noteOn(69,sound);
 const before=writes.length;
 sid.setLiveDetune(80);
 assert.equal(sid.current,69);
 assert.deepEqual(sid.held,[69]);
 const live=writes.slice(before);
 assert.ok(live.some(([r])=>[0,7,14].includes(r%32)));
 assert.equal(live.some(([r])=>[4,11,18].includes(r%32)),false,'no live detune gate cycles');
 const previous=writes.length;
 sid.configure({detune:30});
 assert.equal(sid.current,69,'manually moving detune must not stop held notes');
 assert.equal(sid.detune,30);
 assert.ok(writes.length>previous);
 assert.equal(writes.slice(previous).some(([r])=>[4,11,18].includes(r%32)),false);
});

test('ADSR LFO updates affect all active unison voices and no SID gates',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:5,unison:true});
 sid.noteOn(69,sound);
 const before=writes.length;
 sid.setEnvelope({...sound,attack:.5,sustain:.2});
 const live=writes.slice(before);
 assert.equal(live.some(([r])=>[4,11,18].includes(r%32)),false);
 const envelopeVoices=new Set(live.filter(([r])=>[5,6,12,13,19,20].includes(r%32)).map(([r])=>r));
 assert.ok(envelopeVoices.size>=5,'live ADSR reached all five SID oscillators');
 const same=writes.length;
 sid.setEnvelope({...sound,attack:.5,sustain:.2});
 assert.equal(writes.length,same,'identical live ADSR values do not generate writes');
});

test('ADSR LFO updates reach only allocated polyphonic voices, not inactive slots',()=>{
 const writes=[],sid=new UnisonSidController((r,v)=>writes.push([r,v]),{voiceCount:5,unison:false});
 sid.noteOn(60,sound);sid.noteOn(64,sound);
 const before=writes.length;
 sid.setEnvelope({...sound,attack:.8,release:1.2});
 const live=writes.slice(before);
 const slots=new Set(live.map(([r])=>r));
 assert.deepEqual([...slots].sort((a,b)=>a-b),[5,6,12,13]);
 sid.setLiveDetune(90);
 assert.equal(writes.slice(before).some(([r])=>[0,1,7,8].includes(r)),false,'detune is unison only');
});
