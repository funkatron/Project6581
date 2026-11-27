import {UnisonSidController} from './unison-sid-controller.js?v=__BUILD_ID__';
import {slotRegister,noteFrequency} from './note-writes.js?v=__BUILD_ID__';

// Step G2 (Game Arp in the worklet): one writer for SID 1–3.
//
// The page keeps calling the same controller methods (noteOn/noteOff/panic/…),
// but with the worklet note controller on, each call becomes an ordered op in
// the page's write queue. The worklet applies the ops at the start of a block,
// in queue order with any plain register writes, through its own
// UnisonSidController: the same allocation, the same SidRegisters, so the same
// writes the page sends today.
//
// Page side (createNoteControllerProxy):
// - A shadow UnisonSidController with no writer runs every call first, so
//   noteOn returns its token at once and drum-slot evictions still reach the page.
// - Voice settings come from page getters (functions cannot cross postMessage).
//   The proxy records each getter call the shadow makes, in order, and sends the
//   values with the op. The worklet controller is in the same state, so it makes
//   the same calls in the same order and gets the same values back. That also
//   covers getters stored with a held note and called later (mono fallback).
// - Pitch-envelope callbacks run in the worklet, not on the page.
//
// Worklet side (createWorkletNoteController): apply(op) runs one op and returns
// the number of register writes it made. A settings count that does not match
// the page's is reported as an error (the two controllers disagree).

export const NOTE_OP='note-op';

/** The worklet's sequencer modules can run note ops (bundle API v8+ and self-test ok). */
export function workletNotesSupported(support){
 return support?.available===true&&Number(support.version)>=8&&support.selfTest?.ok===true;
}

/**
 * Page side. `send(op)` queues one op behind any pending register writes.
 * Same methods and read-only allocation fields as UnisonSidController.
 */
export function createNoteControllerProxy(send,{voiceCount=1,unisonCount=1,mode='mono',detune=0,onDrumNoteEvicted=()=>{}}={}){
 let recording=null;
 const shadow=new UnisonSidController(()=>{},{voiceCount,unisonCount,mode,detune,onDrumNoteEvicted});
 const record=getter=>slot=>{
  const value=getter(slot);
  recording?.push(value);
  return value;
 };
 const run=(op,call)=>{
  const values=[];recording=values;
  let result;
  try{result=call()}finally{recording=null}
  if(values.length){
   // Unison layers share one settings object: send each once, then indexes.
   const settings=[],calls=values.map(value=>{
    let index=settings.indexOf(value);
    if(index<0){index=settings.length;settings.push(value)}
    return index;
   });
   op.settings=settings;op.calls=calls;
  }
  send({type:NOTE_OP,...op});
  return result;
 };
 send({type:NOTE_OP,op:'init',options:{voiceCount:shadow.voiceCount,unisonCount:shadow.unisonCount,mode:shadow.mode,detune:shadow.detune}});
 const proxy={
  worklet:true,
  shadow,
  get voiceCount(){return shadow.voiceCount},
  get unisonCount(){return shadow.unisonCount},
  get mode(){return shadow.mode},
  get detune(){return shadow.detune},
  get capacity(){return shadow.capacity},
  configure(options={}){return run({op:'configure',options:{...options}},()=>shadow.configure(options))},
  noteOn(note,settings,{chipMask=null,layerChip=null,drumSlot=null}={}){
   const getter=typeof settings==='function'?settings:()=>settings;
   const options={chipMask:Array.isArray(chipMask)?[...chipMask]:null,layerChip,drumSlot};
   const op={op:'noteOn',note,options};
   return run(op,()=>{
    const token=shadow.noteOn(note,record(getter),options);
    op.token=token;
    return token;
   });
  },
  noteOff(note,token){return run({op:'noteOff',note,token},()=>shadow.noteOff(note,token))},
  panic(){return run({op:'panic'},()=>shadow.panic())},
  forceSilent(){return run({op:'forceSilent'},()=>shadow.forceSilent())},
  setLiveDetune(cents){return run({op:'setLiveDetune',cents},()=>shadow.setLiveDetune(cents))},
  setEnvelope(settings,chip){return run({op:'setEnvelope',values:settings,chip},()=>shadow.setEnvelope(settings,chip))},
  setFilter(settings,chip){return run({op:'setFilter',values:settings,chip},()=>shadow.setFilter(settings,chip))},
  setPulse(voice,percent,chip){return run({op:'setPulse',voice,percent,chip},()=>shadow.setPulse(voice,percent,chip))}
 };
 return proxy;
}

/**
 * Worklet side. `write(register, value)` writes to the chip; the pitch callbacks
 * take the processor's existing message shapes ({register, baseFrequency, …}).
 */
export function createWorkletNoteController({write,startPitchEnvelope=()=>{},retunePitchEnvelope=()=>{},stopPitchEnvelope=()=>{}}){
 let pending=null,cursor=0,writes=0,controller=null;
 const stats={ops:0,writes:0,errors:0,lastError:null};
 const settingsGetter=()=>{
  if(!pending||cursor>=pending.length)throw new Error('note op: page sent fewer voice settings than the worklet needs');
  return pending[cursor++];
 };
 const create=options=>new UnisonSidController((register,value)=>{writes++;write(register,value)},{...options,
  onPitchStart:(slot,note,envelope)=>startPitchEnvelope({register:slotRegister(slot),baseFrequency:noteFrequency(note),
   points:envelope.points,interpolation:envelope.interpolation,end:envelope.end}),
  onPitchRetune:(slot,note)=>retunePitchEnvelope({register:slotRegister(slot),baseFrequency:noteFrequency(note)}),
  onPitchStop:slot=>stopPitchEnvelope({register:slotRegister(slot)})
 });
 function dispatch(op){
  if(op.op==='init'){controller=create(op.options??{});return}
  if(!controller)throw new Error('note op before init: '+op.op);
  switch(op.op){
   case 'configure':controller.configure(op.options??{});break;
   case 'noteOn':
    if(!Number.isInteger(op.token)||op.token<1)throw new Error('note op: noteOn without a token');
    // The page's shadow numbered this note; take its number so later noteOffs match.
    controller.sequence=op.token-1;
    controller.noteOn(op.note,settingsGetter,op.options??{});
    break;
   case 'noteOff':controller.noteOff(op.note,op.token);break;
   case 'panic':controller.panic();break;
   case 'forceSilent':controller.forceSilent();break;
   case 'setLiveDetune':controller.setLiveDetune(op.cents);break;
   case 'setEnvelope':controller.setEnvelope(op.values,op.chip);break;
   case 'setFilter':controller.setFilter(op.values,op.chip);break;
   case 'setPulse':controller.setPulse(op.voice,op.percent,op.chip);break;
   default:throw new Error('unknown note op: '+op.op);
  }
 }
 return {
  get ready(){return controller!==null},
  get controller(){return controller},
  /** Runs one op; returns the register writes it made. Throws on a bad op or a settings mismatch. */
  apply(op){
   pending=Array.isArray(op?.calls)?op.calls.map(index=>op.settings[index]):[];
   cursor=0;writes=0;
   try{
    dispatch(op);
    if(cursor!==pending.length)throw new Error('note op: page sent '+pending.length+' voice settings, worklet used '+cursor);
    stats.ops++;
   }catch(error){
    stats.errors++;stats.lastError=String(error?.message??error);
    throw error;
   }finally{
    stats.writes+=writes;pending=null;
   }
   return writes;
  },
  /** {ops, writes, errors, lastError} since the last call. */
  takeStats(){
   const out={...stats};
   stats.ops=0;stats.writes=0;stats.errors=0;stats.lastError=null;
   return out;
  }
 };
}
