import {UnisonSidController} from './unison-sid-controller.js?v=0.30.0+20261128T010628315Z';
import {slotRegister,noteFrequency} from './note-writes.js?v=0.30.0+20261128T010628315Z';

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
// - Voice settings: functions cannot cross postMessage. The page's live getter
//   (sid-studio.js voiceSettingsForSlot) depends only on the chip, so the proxy
//   keeps the worklet's copy of each melodic chip's live settings current ('live'
//   ops, sent only when they change, always before the op that may read them).
//   A note played with the live getter reads that copy whenever the controller
//   asks, as the page's getter reads page state (mono fallback included). Any
//   other getter (drum hits pass ()=>settings) is sent as a fixed snapshot.
// - Pitch-envelope callbacks run in the worklet, not on the page.
//
// Worklet side (createWorkletNoteController): apply(op) runs one op and returns
// the number of register writes it made. play()/release() let the worklet's own
// generators (G3, Game Arp) start notes with the live settings; their tokens
// come from a separate range so they never collide with the page's.

export const NOTE_OP='note-op';

/** The worklet's sequencer modules can run note ops (bundle API v8+ and self-test ok). */
export function workletNotesSupported(support){
 return support?.available===true&&Number(support.version)>=8&&support.selfTest?.ok===true;
}

/**
 * Page side. `send(op)` queues one op behind any pending register writes.
 * Same methods and read-only allocation fields as UnisonSidController.
 */
export const LIVE_CHIPS=3;
export function createNoteControllerProxy(send,{voiceCount=1,unisonCount=1,mode='mono',detune=0,onDrumNoteEvicted=()=>{},liveGetter=null}={}){
 const shadow=new UnisonSidController(()=>{},{voiceCount,unisonCount,mode,detune,onDrumNoteEvicted});
 const liveStamps=Array.from({length:LIVE_CHIPS},()=>null);
 const post=op=>send({type:NOTE_OP,...op});
 /** Sends each melodic chip's live settings that changed since the last send. */
 function syncLive(){
  if(typeof liveGetter!=='function')return;
  for(let chip=0;chip<LIVE_CHIPS;chip++){
   const values=liveGetter(chip*3);
   const stamp=JSON.stringify(values);
   if(stamp===liveStamps[chip])continue;
   liveStamps[chip]=stamp;
   post({op:'live',chip,values});
  }
 }
 const run=(op,call)=>{
  syncLive();
  const result=call();
  post(op);
  return result;
 };
 post({op:'init',options:{voiceCount:shadow.voiceCount,unisonCount:shadow.unisonCount,mode:shadow.mode,detune:shadow.detune}});
 return {
  worklet:true,
  shadow,
  syncLive,
  get voiceCount(){return shadow.voiceCount},
  get unisonCount(){return shadow.unisonCount},
  get mode(){return shadow.mode},
  get detune(){return shadow.detune},
  get capacity(){return shadow.capacity},
  configure(options={}){return run({op:'configure',options:{...options}},()=>shadow.configure(options))},
  noteOn(note,settings,{chipMask=null,layerChip=null,drumSlot=null}={}){
   const options={chipMask:Array.isArray(chipMask)?[...chipMask]:null,layerChip,drumSlot};
   const live=settings===liveGetter&&typeof liveGetter==='function';
   const fixed=live?null:(typeof settings==='function'?settings(0):settings);
   const op={op:'noteOn',note,options,...(live?{live:true}:{fixed})};
   return run(op,()=>{
    const token=shadow.noteOn(note,live?settings:()=>fixed,options);
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
}

/**
 * Worklet side. `write(register, value)` writes to the chip; the pitch callbacks
 * take the processor's existing message shapes ({register, baseFrequency, …}).
 */
/** First token of the worklet's own notes (G3 generators); page tokens count up from 1. */
export const WORKLET_TOKEN_BASE=1e9;

export function createWorkletNoteController({write,startPitchEnvelope=()=>{},retunePitchEnvelope=()=>{},stopPitchEnvelope=()=>{}}){
 let writes=0,controller=null,localTokens=0;
 const live=Array.from({length:LIVE_CHIPS},()=>null);
 const stats={ops:0,writes:0,errors:0,lastError:null};
 const liveGetter=slot=>{
  const chip=Math.floor(slot/3);
  const values=live[chip];
  if(!values)throw new Error('note op: no live voice settings for SID '+(chip+1));
  return values;
 };
 const create=options=>new UnisonSidController((register,value)=>{writes++;write(register,value)},{...options,
  onPitchStart:(slot,note,envelope)=>startPitchEnvelope({register:slotRegister(slot),baseFrequency:noteFrequency(note),
   points:envelope.points,interpolation:envelope.interpolation,end:envelope.end}),
  onPitchRetune:(slot,note)=>retunePitchEnvelope({register:slotRegister(slot),baseFrequency:noteFrequency(note)}),
  onPitchStop:slot=>stopPitchEnvelope({register:slotRegister(slot)})
 });
 function dispatch(op){
  if(op.op==='init'){controller=create(op.options??{});return}
  if(op.op==='live'){
   if(!Number.isInteger(op.chip)||op.chip<0||op.chip>=LIVE_CHIPS||!op.values||typeof op.values!=='object')throw new Error('note op: bad live settings');
   live[op.chip]=op.values;return;
  }
  if(!controller)throw new Error('note op before init: '+op.op);
  switch(op.op){
   case 'configure':controller.configure(op.options??{});break;
   case 'noteOn':{
    if(!Number.isInteger(op.token)||op.token<1)throw new Error('note op: noteOn without a token');
    if(op.live!==true&&(!op.fixed||typeof op.fixed!=='object'))throw new Error('note op: noteOn without voice settings');
    // The page's shadow numbered this note; take its number so later noteOffs match.
    controller.sequence=op.token-1;
    const fixed=op.fixed;
    controller.noteOn(op.note,op.live===true?liveGetter:()=>fixed,op.options??{});
    break;
   }
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
 const counted=fn=>{
  writes=0;
  try{return fn()}
  catch(error){stats.errors++;stats.lastError=String(error?.message??error);throw error}
  finally{stats.writes+=writes}
 };
 return {
  get ready(){return controller!==null&&live.every(Boolean)},
  get controller(){return controller},
  /** Runs one page op; returns the register writes it made. Throws on a bad op. */
  apply(op){
   counted(()=>dispatch(op));
   stats.ops++;
   return writes;
  },
  /**
   * The worklet's own note-on (G3 generators), with the page's live settings:
   * what the page's playOne() asks of its controller. Returns {token, writes}.
   */
  play(note,{chipMask=null,layerChip=null}={}){
   if(!controller)throw new Error('worklet note before init');
   const token=counted(()=>{
    const saved=controller.sequence;
    controller.sequence=WORKLET_TOKEN_BASE+localTokens++;
    const value=controller.noteOn(note,liveGetter,{chipMask,layerChip});
    // Page tokens keep counting where they were.
    controller.sequence=saved;
    return value;
   });
   return {token,writes};
  },
  /** The worklet's own note-off; returns the register writes it made. */
  release(note,token){
   if(!controller)return 0;
   counted(()=>controller.noteOff(note,token));
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
