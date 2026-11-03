import test from 'node:test';
import assert from 'node:assert/strict';
import {SidRegisters,freqRegister,pulseRegister,closestRate} from '../src/sid-registers.js';
test('A4 frequency uses PAL SID clock',()=>assert.equal(freqRegister(440),7492));
test('pulse register uses twelve bits',()=>assert.equal(pulseRegister(50),2048));
test('ADSR rates select closest SID timing',()=>{assert.equal(closestRate(.002),0);assert.equal(closestRate(8),15)});
test('note writes frequency, PW, ADSR and gates on',()=>{const writes=[];const sid=new SidRegisters((r,v)=>writes.push([r,v]));sid.noteOn(1,69,{wave:'pulse',pulse:50,attack:.002,decay:.008,sustain:1,release:.08});assert.deepEqual(writes.slice(0,4),[[7,0x44],[8,0x1d],[9,0],[10,8]]);assert.deepEqual(writes.slice(-2),[[11,0x40],[11,0x41]]);sid.noteOff(1);assert.deepEqual(writes.at(-1),[11,0x40]);});
test('filter writes shared registers',()=>{const writes=[];new SidRegisters((r,v)=>writes.push([r,v])).setFilter({cutoff:2047,resonance:15,mode:'highpass'});assert.deepEqual(writes,[[21,7],[22,255],[23,247],[24,79]])});
test('reject invalid voice',()=>assert.throws(()=>new SidRegisters(()=>{}).noteOff(3),RangeError));
