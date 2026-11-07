import {SidRegisters} from './sid-registers.js';

// Eight available SID oscillators across three three-voice chips.
// voiceCount is the total budget; unisonCount is the layers per sounding pitch.
export class UnisonSidController {
 constructor(write,{voiceCount=1,unisonCount=1,mode='mono',detune=0,onPitchStart=()=>{},onPitchStop=()=>{},onPitchRetune=()=>{}}={}){
  this.chips=Array.from({length:3},(_,chip)=>new SidRegisters((reg,value)=>write(chip*0x20+reg,value)));
  this.onPitchStart=onPitchStart;this.onPitchStop=onPitchStop;this.onPitchRetune=onPitchRetune;
  this.voiceCount=1;this.unisonCount=1;this.mode='mono';
  this.detune=0;this.liveDetune=0;this.held=[];this.monoTokens=new Map();
  this.current=null;this.currentToken=null;this.settings=null;
  this.polyNotes=new Map();this.sequence=0;
  this.configure({voiceCount,unisonCount,mode,detune});
 }
 configure({voiceCount=this.voiceCount,unisonCount=this.unisonCount,mode=this.mode,detune=this.detune}={}){
  const count=Math.max(1,Math.min(8,Math.round(Number(voiceCount)||1)));
  const layers=Math.max(1,Math.min(count,Math.round(Number(unisonCount)||1)));
  const assignment=['mono','legato','duo','poly'].includes(mode)?mode:'mono';
  const cents=Math.max(0,Math.min(100,Number(detune)||0));
  if(count===this.voiceCount&&layers===this.unisonCount&&assignment===this.mode){
   const changed=cents!==this.detune;
   this.detune=cents;
   if(changed)this.setLiveDetune(cents);
   return;
  }
  this.panic();
  this.voiceCount=count;this.unisonCount=layers;this.mode=assignment;
  this.detune=cents;this.liveDetune=cents;
 }
 get capacity(){
  const available=Math.floor(this.voiceCount/this.unisonCount);
  return this.mode==='mono'||this.mode==='legato'?1:
   this.mode==='duo'?Math.min(2,available):available;
 }
 chip(slot){return this.chips[Math.floor(slot/3)]}
 voice(slot){return slot%3}
 offset(index){
  return this.unisonCount===1?0:
   (index-(this.unisonCount-1)/2)*2*this.liveDetune/(this.unisonCount-1)/100;
 }
 stackSlots(index){return Array.from({length:this.unisonCount},(_,i)=>index*this.unisonCount+i)}
 trigger(slots,note,settings){
  const getter=typeof settings==='function'?settings:()=>settings;
  const parameters=getter(0);
  slots.forEach((slot,i)=>{
   const tuned=note+this.offset(i);
   this.onPitchStop(slot);
   this.chip(slot).noteOn(this.voice(slot),tuned,parameters);
   if(parameters.pitchEnvelope?.enabled===true)this.onPitchStart(slot,tuned,parameters.pitchEnvelope);
  });
  return getter;
 }
 releaseSlots(slots){for(const slot of slots){this.onPitchStop(slot);this.chip(slot).noteOff(this.voice(slot))}}
 retuneSlots(slots,note){slots.forEach((slot,i)=>{
  const tuned=note+this.offset(i);
  this.onPitchRetune(slot,tuned);
  this.chip(slot).setFrequency(this.voice(slot),tuned);
 })}
 noteOn(note,settings){
  if(!Number.isFinite(note))throw new RangeError('MIDI note');
  const token=++this.sequence;
  const getter=typeof settings==='function'?settings:()=>settings;
  if(this.mode==='mono'||this.mode==='legato'){
   this.held=this.held.filter(pitch=>pitch!==note);this.held.push(note);
   this.monoTokens.set(note,{token,getter});
   if(this.mode==='legato'&&this.current!==null){
    this.current=note;this.currentToken=token;this.settings=getter;
    this.retuneSlots(this.stackSlots(0),note);
   }else{
    this.releaseVoices();
    this.current=note;this.currentToken=token;
    this.settings=this.trigger(this.stackSlots(0),note,getter);
   }
   return token;
  }
  if(this.polyNotes.has(note))this.releasePoly(note);
  while(this.polyNotes.size>=this.capacity)this.releasePoly(this.polyNotes.keys().next().value);
  const used=new Set([...this.polyNotes.values()].map(entry=>entry.index));
  let index=0;while(used.has(index))index++;
  const slots=this.stackSlots(index);
  this.polyNotes.set(note,{token,index,slots,getter:this.trigger(slots,note,getter)});
  return token;
 }
 releaseVoices(){
  if(this.current===null)return;
  this.releaseSlots(this.stackSlots(0));this.current=null;this.currentToken=null;
 }
 releasePoly(note){
  const entry=this.polyNotes.get(note);if(!entry)return;
  this.releaseSlots(entry.slots);this.polyNotes.delete(note);
 }
 noteOff(note,token){
  if(this.mode==='mono'||this.mode==='legato'){
   const owner=this.monoTokens.get(note);
   if(!owner||(token!==undefined&&token!==owner.token))return;
   this.monoTokens.delete(note);this.held=this.held.filter(pitch=>pitch!==note);
   if(this.current!==note||this.currentToken!==owner.token)return;
   if(this.held.length){
    const fallback=this.held[this.held.length-1],next=this.monoTokens.get(fallback);
    if(this.mode==='legato'){
     this.current=fallback;this.currentToken=next.token;this.settings=next.getter;
     this.retuneSlots(this.stackSlots(0),fallback);
    }else{
     this.releaseVoices();this.current=fallback;this.currentToken=next.token;
     this.settings=this.trigger(this.stackSlots(0),fallback,next.getter);
    }
   }else this.releaseVoices();
   return;
  }
  const entry=this.polyNotes.get(note);
  if(!entry||(token!==undefined&&token!==entry.token))return;
  this.releasePoly(note);
 }
 panic(){
  this.releaseVoices();
  for(const note of [...this.polyNotes.keys()])this.releasePoly(note);
  this.held=[];this.monoTokens.clear();this.settings=null;
 }
 setLiveDetune(cents){
  const next=Math.max(0,Math.min(100,Number(cents)||0));
  if(next===this.liveDetune)return;this.liveDetune=next;
  if(this.unisonCount<=1)return;
  if(this.current!==null)this.retuneSlots(this.stackSlots(0),this.current);
  for(const [note,entry] of this.polyNotes)this.retuneSlots(entry.slots,note);
 }
 setEnvelope(settings){
  const slots=this.current!==null?this.stackSlots(0):
   [...this.polyNotes.values()].flatMap(entry=>entry.slots);
  for(const slot of slots)this.chip(slot).setEnvelope(this.voice(slot),settings);
 }
 setFilter(settings){for(const chip of this.chips)chip.setFilter(settings)}
 setPulse(_voice,percent){
  const slots=this.current!==null?this.stackSlots(0):
   [...this.polyNotes.values()].flatMap(entry=>entry.slots);
  for(const slot of slots)this.chip(slot).setPulse(this.voice(slot),percent);
 }
}
