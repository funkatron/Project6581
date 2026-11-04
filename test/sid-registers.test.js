import test from 'node:test';
import assert from 'node:assert/strict';
import {SidRegisters,freqRegister,pulseRegister,closestRate} from '../src/sid-registers.js';
test('A4 frequency uses PAL SID clock',()=>assert.equal(freqRegister(440),7493));
test('pulse register uses twelve bits',()=>assert.equal(pulseRegister(50),2048));
test('ADSR rates select closest SID timing',()=>{assert.equal(closestRate(.002),0);assert.equal(closestRate(8),15)});
test('note writes frequency, PW, ADSR and gates on',()=>{const writes=[];const sid=new SidRegisters((r,v)=>writes.push([r,v]));sid.noteOn(1,69,{wave:'pulse',pulse:50,attack:.002,decay:.008,sustain:1,release:.08});assert.deepEqual(writes.slice(0,4),[[7,0x45],[8,0x1d],[9,0],[10,8]]);assert.deepEqual(writes.slice(-2),[[11,0x40],[11,0x41]]);sid.noteOff(1);assert.deepEqual(writes.at(-1),[11,0x40]);});
test('filter writes shared registers',()=>{const writes=[];new SidRegisters((r,v)=>writes.push([r,v])).setFilter({cutoff:2047,resonance:15,mode:'highpass'});assert.deepEqual(writes,[[21,7],[22,255],[23,247],[24,79]])});
test('reject invalid voice',()=>assert.throws(()=>new SidRegisters(()=>{}).noteOff(3),RangeError));

test('live pitch, ADSR and pulse updates avoid retriggering active SID notes',()=>{
 const writes=[],sid=new SidRegisters((r,v)=>writes.push([r,v]));
 const sound={wave:'pulse',pulse:50,attack:.002,decay:.008,sustain:1,release:.08};
 sid.noteOn(0,69,sound);
 const initial=writes.length;
 sid.setEnvelope(0,sound);sid.setPulse(0,50);sid.setFrequency(0,69);
 assert.equal(writes.length,initial,'unchanged register values must not be rewritten');
 sid.setFrequency(0,72);
 sid.setEnvelope(0,{...sound,attack:.25,sustain:.3});
 sid.setPulse(0,25);
 const live=writes.slice(initial);
 assert.ok(live.some(([r])=>r===0));
 assert.ok(live.some(([r])=>r===1));
 assert.ok(live.some(([r])=>r===2));
 assert.ok(live.some(([r])=>r===3));
 assert.ok(live.some(([r])=>r===5));
 assert.ok(live.some(([r])=>r===6));
 assert.equal(live.some(([r])=>r===4),false,'live modulation cannot gate or retrigger a voice');
});

test('60 Hz filter updates emit only changed SID register values',()=>{
 const writes=[],sid=new SidRegisters((r,v)=>writes.push([r,v]));
 sid.setFilter({cutoff:1024,resonance:5,volume:9});
 assert.equal(writes.length,4);
 sid.setFilter({cutoff:1024,resonance:5,volume:9});
 assert.equal(writes.length,4);
 sid.setFilter({cutoff:1025,resonance:5,volume:9});
 assert.equal(writes.length,5);
 assert.equal(writes.at(-1)[0],0x15);
 sid.setFilter({cutoff:1025,resonance:5,volume:10});
 assert.equal(writes.at(-1)[0],0x18);
});

test('live SID parameter updates reject invalid oscillator indexes',()=>{
 const sid=new SidRegisters(()=>{});
 for(const voice of [-1,3,0.5]){
  assert.throws(()=>sid.setFrequency(voice,69),RangeError);
  assert.throws(()=>sid.setEnvelope(voice,{}),RangeError);
  assert.throws(()=>sid.setPulse(voice,50),RangeError);
 }
});
