import {SidRegisters} from './sid-registers.js';
import {SID_CHIP_COUNT,isDrumChip} from './sid-engines.js';

// Up to nine melodic oscillators on SID 1–3.
// SID 4–6 are monophonic drum chips (kick, snare, cymbals), each using voice 0.
// voiceCount is the melodic budget; unisonCount is the layers per sounding pitch.
export class UnisonSidController {
 constructor(write,{voiceCount=1,unisonCount=1,mode='mono',detune=0,onPitchStart=()=>{},onPitchStop=()=>{},onPitchRetune=()=>{},onDrumNoteEvicted=()=>{}}={}){
  this.chips=Array.from({length:SID_CHIP_COUNT},(_,chip)=>new SidRegisters((reg,value)=>write(chip*0x20+reg,value)));
  this.onPitchStart=onPitchStart;this.onPitchStop=onPitchStop;this.onPitchRetune=onPitchRetune;
  this.onDrumNoteEvicted=onDrumNoteEvicted;
  this.voiceCount=1;this.unisonCount=1;this.mode='mono';
  this.detune=0;this.liveDetune=0;this.held=[];this.monoTokens=new Map();
  this.current=null;this.currentToken=null;this.settings=null;this.currentSlotMap=null;
  this.polyNotes=new Map();this.sequence=0;
  this.layerStacks=Array.from({length:SID_CHIP_COUNT},()=>null);
  this.layerPoly=Array.from({length:SID_CHIP_COUNT},()=>new Map());
  this.configure({voiceCount,unisonCount,mode,detune});
 }
 configure({voiceCount=this.voiceCount,unisonCount=this.unisonCount,mode=this.mode,detune=this.detune}={}){
  const count=Math.max(1,Math.min(9,Math.round(Number(voiceCount)||1)));
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
 buildSlotMap(chipMask){
  if(!Array.isArray(chipMask)||!chipMask.length)
   return Array.from({length:this.voiceCount},(_,slot)=>slot);
  const slots=[];
  for(const chip of [...chipMask].sort((a,b)=>a-b)){
   for(let voice=0;voice<3;voice++)slots.push(chip*3+voice);
   if(slots.length>=this.voiceCount)break;
  }
  return slots.slice(0,this.voiceCount);
 }
 stackSlots(index,slotMap){
  const map=slotMap??this.buildSlotMap(null);
  const start=index*this.unisonCount;
  return map.slice(start,Math.min(start+this.unisonCount,map.length));
 }
 capacityFor(slotMap){
  const voices=slotMap.length;
  if(!voices)return 0;
  // Layer routes use at most three oscillators per chip even when the global unison budget is higher.
  const stackSpan=Math.min(this.unisonCount,voices);
  const available=Math.floor(voices/stackSpan);
  return this.mode==='mono'||this.mode==='legato'?1:
   this.mode==='duo'?Math.min(2,available):available;
 }
 get capacity(){return this.capacityFor(this.buildSlotMap(null))}
  chip(slot){
   const index=Math.floor(slot/3);
   if(index<0||index>=SID_CHIP_COUNT)throw new RangeError('voice slot');
   return this.chips[index];
  }
 voice(slot){return slot%3}
 offset(index){
  return this.unisonCount===1?0:
   (index-(this.unisonCount-1)/2)*2*this.liveDetune/(this.unisonCount-1)/100;
 }
 trigger(slots,note,settings){
  const getter=typeof settings==='function'?settings:()=>settings;
  slots.forEach((slot,i)=>{
   const parameters=typeof settings==='function'?getter(slot):getter(0);
   const tuned=note+this.offset(i);
   this.onPitchStop(slot);
   this.chip(slot).noteOn(this.voice(slot),tuned,parameters);
   if(parameters.pitchEnvelope?.enabled===true)this.onPitchStart(slot,tuned,parameters.pitchEnvelope);
  });
  return getter;
 }
 releaseSlots(slots){for(const slot of slots){this.onPitchStop(slot);this.chip(slot).noteOff(this.voice(slot))}}
 releaseLayerPoly(chip,note){
  const entry=this.layerPoly[chip].get(note);
  if(!entry)return;
  this.releaseSlots(entry.slots);
  this.layerPoly[chip].delete(note);
 }
 releaseLayerStack(chip){
  const stack=this.layerStacks[chip];
  if(!stack)return;
  this.releaseSlots(this.stackSlots(0,stack.slotMap));
  this.layerStacks[chip]=null;
 }
 noteOnDrumLane(chip,note,getter,slotMap,poly,token,drumSlot){
  const slotIndex=Math.max(0,Math.min(slotMap.length-1,drumSlot));
  const targetSlot=slotMap[slotIndex];
  for(const [pitched,entry] of [...poly.entries()]){
   if(!entry.slots.includes(targetSlot))continue;
   this.releaseLayerPoly(chip,pitched);
   this.onDrumNoteEvicted(pitched);
  }
  if(poly.has(note))this.releaseLayerPoly(chip,note);
  const slots=[targetSlot];
  poly.set(note,{token,index:slotIndex,slots,slotMap,getter:this.trigger(slots,note,getter)});
  return token;
 }
 noteOnLayer(chip,note,settings,chipMask,drumSlot=null){
  if(!Number.isInteger(chip)||chip<0||chip>=SID_CHIP_COUNT)throw new RangeError('layer chip');
  const token=++this.sequence;
  const getter=typeof settings==='function'?settings:()=>settings;
  const mask=Array.isArray(chipMask)&&chipMask.length?chipMask:[chip];
  const drumLane=isDrumChip(chip);
  if(drumLane){
   return this.noteOnDrumLane(chip,note,getter,[chip*3],this.layerPoly[chip],token,0);
  }
  const slotMap=this.buildSlotMap(mask);
  const mode=this.mode;
  const capacity=this.capacityFor(slotMap);
  if(mode==='mono'||mode==='legato'){
   const prior=this.layerStacks[chip];
   if(mode==='legato'&&prior){
    prior.note=note;prior.token=token;prior.getter=getter;prior.slotMap=slotMap;
    this.retuneSlots(this.stackSlots(0,slotMap),note);
    return token;
   }
   if(prior)this.releaseLayerStack(chip);
   const applied=this.trigger(this.stackSlots(0,slotMap),note,getter);
   this.layerStacks[chip]={note,token,slotMap,getter:applied};
   return token;
  }
  const poly=this.layerPoly[chip];
  if(poly.has(note))this.releaseLayerPoly(chip,note);
  while(capacity>0&&poly.size>=capacity)this.releaseLayerPoly(chip,poly.keys().next().value);
  const used=new Set([...poly.values()].map(entry=>entry.index));
  let index=0;while(used.has(index))index++;
  const slots=this.stackSlots(index,slotMap);
  poly.set(note,{token,index,slots,slotMap,getter:this.trigger(slots,note,getter)});
  return token;
 }
 noteOffLayer(chip,note,token){
  const stack=this.layerStacks[chip];
  if(stack&&stack.note===note&&(token===undefined||stack.token===token)){
   this.releaseLayerStack(chip);
   return true;
  }
  const entry=this.layerPoly[chip].get(note);
  if(entry&&(token===undefined||entry.token===token)){
   this.releaseLayerPoly(chip,note);
   return true;
  }
  return false;
 }
 retuneSlots(slots,note){slots.forEach((slot,i)=>{
  const tuned=note+this.offset(i);
  this.onPitchRetune(slot,tuned);
  this.chip(slot).setFrequency(this.voice(slot),tuned);
 })}
 noteOn(note,settings,{chipMask=null,layerChip=null,drumSlot=null}={}){
  if(!Number.isFinite(note))throw new RangeError('MIDI note');
  const isolated=Number.isInteger(layerChip)?layerChip:
   (Array.isArray(chipMask)&&chipMask.length===1?chipMask[0]:null);
  if(Number.isInteger(isolated)&&isolated>=0&&isolated<SID_CHIP_COUNT){
   return this.noteOnLayer(isolated,note,settings,chipMask,drumSlot);
  }
  const token=++this.sequence;
  const getter=typeof settings==='function'?settings:()=>settings;
  const slotMap=this.buildSlotMap(chipMask);
  const capacity=this.capacityFor(slotMap);
  if(this.mode==='mono'||this.mode==='legato'){
   this.held=this.held.filter(pitch=>pitch!==note);this.held.push(note);
   this.monoTokens.set(note,{token,getter,slotMap});
   if(this.mode==='legato'&&this.current!==null){
    this.current=note;this.currentToken=token;this.settings=getter;this.currentSlotMap=slotMap;
    this.retuneSlots(this.stackSlots(0,slotMap),note);
   }else{
    this.releaseVoices();
    this.current=note;this.currentToken=token;this.currentSlotMap=slotMap;
    this.settings=this.trigger(this.stackSlots(0,slotMap),note,getter);
   }
   return token;
  }
  if(this.polyNotes.has(note))this.releasePoly(note);
  while(capacity>0&&this.polyNotes.size>=capacity)this.releasePoly(this.polyNotes.keys().next().value);
  const used=new Set([...this.polyNotes.values()].map(entry=>entry.index));
  let index=0;while(used.has(index))index++;
  const slots=this.stackSlots(index,slotMap);
  this.polyNotes.set(note,{token,index,slots,slotMap,getter:this.trigger(slots,note,getter)});
  return token;
 }
 releaseVoices(){
  if(this.current===null)return;
  this.releaseSlots(this.stackSlots(0,this.currentSlotMap));
  this.current=null;this.currentToken=null;this.currentSlotMap=null;
 }
 releasePoly(note){
  const entry=this.polyNotes.get(note);if(!entry)return;
  this.releaseSlots(entry.slots);this.polyNotes.delete(note);
 }
 noteOff(note,token){
  for(let chip=0;chip<SID_CHIP_COUNT;chip++){
   if(this.noteOffLayer(chip,note,token))return;
  }
  if(this.mode==='mono'||this.mode==='legato'){
   const owner=this.monoTokens.get(note);
   if(!owner||(token!==undefined&&token!==owner.token))return;
   this.monoTokens.delete(note);this.held=this.held.filter(pitch=>pitch!==note);
   if(this.current!==note||this.currentToken!==owner.token)return;
   if(this.held.length){
    const fallback=this.held[this.held.length-1],next=this.monoTokens.get(fallback);
    this.currentSlotMap=next.slotMap;
    if(this.mode==='legato'){
     this.current=fallback;this.currentToken=next.token;this.settings=next.getter;
     this.retuneSlots(this.stackSlots(0,next.slotMap),fallback);
    }else{
     this.releaseVoices();this.current=fallback;this.currentToken=next.token;
     this.settings=this.trigger(this.stackSlots(0,next.slotMap),fallback,next.getter);
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
  for(let chip=0;chip<SID_CHIP_COUNT;chip++){
   if(this.layerStacks[chip])this.releaseLayerStack(chip);
   for(const note of [...this.layerPoly[chip].keys()])this.releaseLayerPoly(chip,note);
  }
  this.held=[];this.monoTokens.clear();this.settings=null;
 }
 forceSilent(){this.panic();for(const chip of this.chips)chip.forceSilent()}
 setLiveDetune(cents){
  const next=Math.max(0,Math.min(100,Number(cents)||0));
  if(next===this.liveDetune)return;this.liveDetune=next;
  if(this.unisonCount<=1)return;
  if(this.current!==null)this.retuneSlots(this.stackSlots(0,this.currentSlotMap),this.current);
  for(const [note,entry] of this.polyNotes)this.retuneSlots(entry.slots,note);
  for(let chip=0;chip<3;chip++){
   const stack=this.layerStacks[chip];
   if(stack)this.retuneSlots(this.stackSlots(0,stack.slotMap),stack.note);
   for(const [note,entry] of this.layerPoly[chip])this.retuneSlots(entry.slots,note);
  }
 }
 setEnvelope(settings,chipIndex){
  if(Number.isInteger(chipIndex)&&chipIndex>=0&&chipIndex<SID_CHIP_COUNT){
   for(let voice=0;voice<3;voice++)this.chips[chipIndex].setEnvelope(voice,settings);
   return;
  }
  const slots=this.current!==null?this.stackSlots(0,this.currentSlotMap):
   [...this.polyNotes.values()].flatMap(entry=>entry.slots);
  for(const slot of slots)this.chip(slot).setEnvelope(this.voice(slot),settings);
 }
 setFilter(settings,chipIndex){
  if(Number.isInteger(chipIndex)&&chipIndex>=0&&chipIndex<SID_CHIP_COUNT)this.chips[chipIndex].setFilter(settings);
  else for(const chip of this.chips)chip.setFilter(settings);
 }
 setPulse(_voice,percent,chipIndex){
  if(Number.isInteger(chipIndex)&&chipIndex>=0&&chipIndex<SID_CHIP_COUNT){
   for(let voice=0;voice<3;voice++)this.chips[chipIndex].setPulse(voice,percent);
   return;
  }
  const slots=this.current!==null?this.stackSlots(0,this.currentSlotMap):
   [...this.polyNotes.values()].flatMap(entry=>entry.slots);
  for(const slot of slots)this.chip(slot).setPulse(this.voice(slot),percent);
 }
}