import {selectRoot,gamePhraseBoundary} from './arp-composition.js?v=__BUILD_ID__';
import {sequenceEvent} from './game-step-sequencer.js?v=__BUILD_ID__';
import {DRUM_STEP_COUNT,hitsOnStep} from './drum-step-sequencer.js?v=__BUILD_ID__';

// Pure step logic for the Root Arp, Game Arp and drum clocks: clock state and
// transport data in; next clock state, note events, key highlights and a status
// descriptor out. No DOM, timers or audio, so the same code can run inside the
// AudioWorklet (agreed order, step 3). Callers apply the result.
//
// Events: {type:'off'|'on', note, source}, applied in order.
// highlight: {root} or {game}; a note shows that key, null clears it, absent = no change.
// resolve: maps a step pitch to the sounding pitch (scale lock). Defaults to identity.

const identity=note=>note;
const on=(note,source)=>({type:'on',note,source});
const off=(note,source)=>({type:'off',note,source});

/**
 * One Root Arp tick.
 * clock: {step, root, last}. notes: sorted active notes.
 * With the Game Arp on, the Root Arp only picks the root (on a phrase boundary,
 * or the first time) and sounds nothing.
 */
export function arpStep(clock,{notes,pattern,gameOn=false,gameStep=0,phraseLength=16,resolve=identity}){
 if(!notes.length){
  if(gameOn)return {clock:{...clock,root:null},events:[],highlight:{},status:{type:'idle'}};
  return {
   clock:{...clock,root:null,last:null},
   events:clock.last===null?[]:[off(clock.last,'arp')],
   highlight:{root:null},
   status:{type:'idle'}
  };
 }
 const note=resolve(selectRoot(notes,pattern,clock.step));
 const step=clock.step+1;
 const status={type:'root',note,count:notes.length};
 if(gameOn){
  const root=clock.root===null||gamePhraseBoundary(gameStep,phraseLength)?note:clock.root;
  return {clock:{step,root,last:clock.last},events:[],highlight:{root:note},status};
 }
 const events=clock.last===null?[]:[off(clock.last,'arp')];
 events.push(on(note,'arp'));
 return {clock:{step,root:note,last:note},events,highlight:{root:note},status};
}

/**
 * One Game Arp tick.
 * clock: {step, last}. root: resolved Game Arp root, or null when nothing should play.
 * `stop: true` means the caller should stop the Game Arp clock (no root).
 * `gate` asks the caller to release the note after `fraction` of a step.
 */
export function gameStep(clock,{root,sequence,resolve=identity}){
 if(root===null)return {stop:true,clock,events:[],highlight:{},status:{type:'idle'}};
 const events=clock.last===null?[]:[off(clock.last,'game')];
 const event=sequenceEvent(root,sequence,clock.step);
 const step=clock.step+1;
 if(!event.gate){
  return {clock:{step,last:null},events,stepIndex:event.index,highlight:{game:null},
   status:{type:'rest',index:event.index}};
 }
 const note=resolve(event.note);
 events.push(on(note,'game'));
 return {
  clock:{step,last:note},events,stepIndex:event.index,highlight:{game:note},
  status:{type:'note',index:event.index,root},
  // The gate names the sounding (resolved) note, so scale lock cannot strand it.
  gate:event.duration<100?{note,fraction:event.duration/100}:null
 };
}

/** One drum tick. clock: {step}. Returns the lane hits for this step. */
export function drumStep(clock,{sequence}){
 const index=clock.step%DRUM_STEP_COUNT;
 return {clock:{step:(index+1)%DRUM_STEP_COUNT},index,hits:hitsOnStep(sequence,index)};
}
