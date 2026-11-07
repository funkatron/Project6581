import test from 'node:test';
import assert from 'node:assert/strict';
import {UnisonSidController} from '../src/unison-sid-controller.js';
const envelope={enabled:true,interpolation:'linear',end:'hold',points:[{ms:0,semitones:12},{ms:100,semitones:0}]};
const settings={wave:'pulse',pulse:50,pitchEnvelope:envelope};
function harness(options={}){
 const events=[];
 const controller=new UnisonSidController(()=>{}, {...options,
  onPitchStart:(slot,note,value)=>events.push(['start',slot,note,value]),
  onPitchStop:slot=>events.push(['stop',slot]),
  onPitchRetune:(slot,note)=>events.push(['retune',slot,note])});
 return {controller,events};
}
test('enabled envelope starts for each unison slot and stops on release',()=>{
 const {controller,events}=harness({voiceCount:2,unisonCount:2});
 const token=controller.noteOn(60,settings);
 assert.deepEqual(events.filter(e=>e[0]==='start').map(e=>e[1]),[0,1]);
 controller.noteOff(60,token);
 assert.deepEqual(events.slice(-2),[['stop',0],['stop',1]]);
});
test('disabled or absent envelopes do not start modulation',()=>{
 const {controller,events}=harness();
 controller.noteOn(60,{wave:'pulse'});
 assert.equal(events.filter(e=>e[0]==='start').length,0);
});
test('retrigger and panic cancel previous envelopes',()=>{
 const {controller,events}=harness();
 const first=controller.noteOn(60,settings);
 const second=controller.noteOn(62,settings);
 controller.noteOff(60,first);
 assert.equal(events.filter(e=>e[0]==='start').length,2);
 controller.panic();
 assert.equal(events.at(-1)[0],'stop');
 controller.noteOff(62,second);
 assert.equal(events.at(-1)[0],'stop');
});

test('live unison detune retunes each slot without cancelling envelopes',()=>{
 const {controller,events}=harness({voiceCount:2,unisonCount:2});
 controller.noteOn(60,settings);
 const before=events.length;
 controller.setLiveDetune(50);
 assert.deepEqual(events.slice(before).map(e=>e[0]),['retune','retune']);
 assert.equal(events.filter(e=>e[0]==='start').length,2);
});
