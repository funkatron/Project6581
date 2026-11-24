import test from 'node:test';
import assert from 'node:assert/strict';
import {UnisonSidController} from '../src/unison-sid-controller.js';
import {createNoteWriter,slotRegister,noteFrequency} from '../src/note-writes.js';
import {createDefaultEngines} from '../src/sid-engines.js';
import {simplePitchEnvelope} from '../src/pitch-envelope.js';

// The page drives UnisonSidController with a getter and callbacks (sid-studio.js
// → create-residfp-audio.js). The worklet will drive it through createNoteWriter
// with plain data. Both must produce the same writes and pitch messages in the
// same order.

const engines=createDefaultEngines();
const voices=engines.map(engine=>({...engine.voice}));
voices[1]={...voices[1],wave:'sawtooth',attack:0.03,release:0.4};
voices[2]={...voices[2],pitchEnvelope:simplePitchEnvelope(true,12,80)};

// Same arithmetic create-residfp-audio.js uses for pitch-envelope messages.
const pageRegister=slot=>Math.floor(slot/3)*0x20+(slot%3)*7;
const pageFrequency=note=>Math.max(0,Math.min(65535,Math.round(440*2**((note-69)/12)*16777216/985248)));

function pageController(options){
 const commands=[];
 const controller=new UnisonSidController((register,value)=>commands.push({type:'write',register,value}),{
  ...options,
  onPitchStart:(slot,note,envelope)=>commands.push({type:'pitch-envelope-start',register:pageRegister(slot),
   baseFrequency:pageFrequency(note),points:envelope.points,interpolation:envelope.interpolation,end:envelope.end}),
  onPitchRetune:(slot,note)=>commands.push({type:'pitch-envelope-retune',register:pageRegister(slot),baseFrequency:pageFrequency(note)}),
  onPitchStop:slot=>commands.push({type:'pitch-envelope-stop',register:pageRegister(slot)}),
  onDrumNoteEvicted:note=>commands.push({type:'drum-note-evicted',note})
 });
 const settingsForSlot=slot=>voices[Math.floor(slot/3)];
 return {
  noteOn:(note,routing)=>{commands.length=0;const token=controller.noteOn(note,settingsForSlot,routing);return {token,commands:[...commands]}},
  noteOff:(note,token)=>{commands.length=0;controller.noteOff(note,token);return [...commands]},
  setLiveDetune:cents=>{commands.length=0;controller.setLiveDetune(cents);return [...commands]},
  panic:()=>{commands.length=0;controller.panic();return [...commands]}
 };
}

function assertParity(options,script){
 const page=pageController(options);
 const writer=createNoteWriter({...options,settings:voices});
 const tokens={page:new Map(),writer:new Map()};
 script.forEach(([action,note,routing],index)=>{
  const label=index+': '+action+' '+(note??'');
  if(action==='on'){
   const a=page.noteOn(note,routing),b=writer.noteOn(note,routing);
   assert.equal(b.token,a.token,label);
   assert.deepEqual(b.commands,a.commands,label);
   tokens.page.set(note,a.token);tokens.writer.set(note,b.token);
  }else if(action==='off'){
   assert.deepEqual(writer.noteOff(note,tokens.writer.get(note)),page.noteOff(note,tokens.page.get(note)),label);
  }else if(action==='detune'){
   assert.deepEqual(writer.setLiveDetune(note),page.setLiveDetune(note),label);
  }else if(action==='panic'){
   assert.deepEqual(writer.panic(),page.panic(),label);
  }
 });
}

test('frequency and register helpers match the page pitch-envelope arithmetic',()=>{
 for(let note=0;note<=127;note+=0.25)assert.equal(noteFrequency(note),pageFrequency(note),String(note));
 for(let slot=0;slot<18;slot++)assert.equal(slotRegister(slot),pageRegister(slot));
});

test('mono: retrigger, fallback to the held note, release',()=>{
 assertParity({voiceCount:1,mode:'mono'},[['on',60],['on',64],['off',64],['off',60],['panic']]);
});

test('legato retunes without regating',()=>{
 assertParity({voiceCount:1,mode:'legato'},[['on',60],['on',67],['off',67],['off',60]]);
});

test('poly with unison and detune, including voice stealing and live detune',()=>{
 assertParity({voiceCount:6,unisonCount:2,mode:'poly',detune:30},
  [['on',60],['on',64],['on',67],['on',71],['detune',55],['off',64],['on',72],['panic']]);
});

test('duo across SID 1 and 2 routes, all-chip route',()=>{
 assertParity({voiceCount:9,mode:'duo'},
  [['on',48,{chipMask:[0,1]}],['on',55,{chipMask:[0,1]}],['on',60,{chipMask:[0,1,2]}],['off',48],['panic']]);
});

test('layer route per chip with a pitch envelope on SID 3',()=>{
 assertParity({voiceCount:9,unisonCount:3,mode:'poly',detune:20},
  [['on',60,{chipMask:[1],layerChip:1}],['on',60,{chipMask:[2],layerChip:2}],['on',64,{chipMask:[2],layerChip:2}],
   ['off',60],['panic']]);
});

test('drum lanes evict the prior note on the same chip',()=>{
 assertParity({voiceCount:3,mode:'mono'},
  [['on',36,{chipMask:[3],layerChip:3,drumSlot:0}],['on',38,{chipMask:[3],layerChip:3,drumSlot:0}],
   ['on',42,{chipMask:[5],layerChip:5,drumSlot:0}],['off',42],['panic']]);
});

test('a pitch envelope start follows the note-on writes for its voice',()=>{
 const writer=createNoteWriter({voiceCount:9,mode:'poly',settings:voices});
 const {commands}=writer.noteOn(62,{chipMask:[2],layerChip:2});
 const start=commands.findIndex(command=>command.type==='pitch-envelope-start');
 assert.ok(start>0);
 assert.deepEqual(commands[start-1],{type:'write',register:0x40+4,value:0x41});
 assert.equal(commands[start].register,0x40);
 assert.equal(commands[start].baseFrequency,noteFrequency(62));
});

test('a chip without settings is a clear error, and settings can be replaced',()=>{
 const writer=createNoteWriter({settings:[]});
 assert.throws(()=>writer.noteOn(60),/no voice settings for SID 1/);
 writer.setSettings(0,voices[0]);
 assert.equal(writer.noteOn(60).commands.at(-1).value,0x41);
 assert.throws(()=>writer.setSettings(6,voices[0]),RangeError);
});
