import {UnisonSidController} from './unison-sid-controller.js?v=0.31.0+20261128T022520326Z';
import {SID_CHIP_COUNT} from './sid-engines.js?v=0.31.0+20261128T022520326Z';
import {freqRegister,midiHz} from './sid-registers.js?v=0.31.0+20261128T022520326Z';

// Step 3 / PR 2 (worklet sequencing): the note → register-write path as data in,
// commands out, so the AudioWorklet can run it without the main thread.
//
// It wraps the same UnisonSidController the page uses; voice allocation,
// unison, detune, layer routes and drum lanes are not duplicated. Differences
// from the page wiring:
// - Voice settings are plain per-chip data (setSettings), not a getter that
//   reads page state, because functions cannot cross postMessage.
// - Writes and pitch-envelope changes are returned in call order as commands.
//   Pitch commands use the worklet's existing message shapes
//   ('pitch-envelope-start' / '-retune' / '-stop'), so the processor can apply
//   them with the handler it already has.
// Nothing calls this from the worklet yet; playback is unchanged.

/** Register of a voice's frequency-low byte, as the worklet's pitch envelopes key it. */
export const slotRegister=slot=>Math.floor(slot/3)*0x20+(slot%3)*7;
/** 16-bit SID frequency for a (possibly detuned) MIDI note, PAL clock. */
export const noteFrequency=note=>freqRegister(midiHz(note));

export function createNoteWriter({voiceCount=1,unisonCount=1,mode='mono',detune=0,settings=[]}={}){
 const chipSettings=Array.from({length:SID_CHIP_COUNT},(_,chip)=>settings[chip]??null);
 let commands=[];
 const controller=new UnisonSidController((register,value)=>commands.push({type:'write',register,value}),{
  voiceCount,unisonCount,mode,detune,
  onPitchStart:(slot,note,envelope)=>commands.push({type:'pitch-envelope-start',register:slotRegister(slot),
   baseFrequency:noteFrequency(note),points:envelope.points,interpolation:envelope.interpolation,end:envelope.end}),
  onPitchRetune:(slot,note)=>commands.push({type:'pitch-envelope-retune',register:slotRegister(slot),baseFrequency:noteFrequency(note)}),
  onPitchStop:slot=>commands.push({type:'pitch-envelope-stop',register:slotRegister(slot)}),
  onDrumNoteEvicted:note=>commands.push({type:'drum-note-evicted',note})
 });
 const settingsForSlot=slot=>{
  const chip=Math.floor(slot/3),value=chipSettings[chip];
  if(!value)throw new RangeError('no voice settings for SID '+(chip+1));
  return value;
 };
 const run=fn=>{
  commands=[];
  const result=fn();
  const out=commands;commands=[];
  return {result,commands:out};
 };
 return {
  controller,
  setSettings(chip,value){
   if(!Number.isInteger(chip)||chip<0||chip>=SID_CHIP_COUNT)throw new RangeError('settings chip');
   chipSettings[chip]=value??null;
  },
  configure(options){return run(()=>controller.configure(options)).commands},
  noteOn(note,options={}){
   const {result,commands:out}=run(()=>controller.noteOn(note,settingsForSlot,options));
   return {token:result,commands:out};
  },
  noteOff(note,token){return run(()=>controller.noteOff(note,token)).commands},
  setLiveDetune(cents){return run(()=>controller.setLiveDetune(cents)).commands},
  /**
   * Filter registers for one chip (SidRegisters.setFilter units); unchanged registers
   * are not rewritten unless force is set (another writer may have changed them).
   */
  setFilter(settings,chip,{force=false}={}){
   if(!Number.isInteger(chip)||chip<0||chip>=SID_CHIP_COUNT)throw new RangeError('filter chip');
   if(force)controller.chips[chip].filterRegisters.clear();
   return run(()=>controller.setFilter(settings,chip)).commands;
  },
  panic(){return run(()=>controller.panic()).commands}
 };
}
