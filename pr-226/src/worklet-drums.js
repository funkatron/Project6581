import {createDrumPlayer} from './drum-player.js?v=0.30.0+20261128T010628315Z';
import {drumStep} from './sequencer-steps.js?v=0.30.0+20261128T010628315Z';
import {drumSequence,drumLaneAudible} from './transport-state.js?v=0.30.0+20261128T010628315Z';
import {resolveDrumHitsOnStep} from './drum-voice-policy.js?v=0.30.0+20261128T010628315Z';
import {drumBusIndexForLane} from './drum-bus-engines.js?v=0.30.0+20261128T010628315Z';
import {DRUM_LANE_IDS} from './drum-step-sequencer.js?v=0.30.0+20261128T010628315Z';

// Step 3c-2 (worklet plays the drums): the worklet side of "Worklet drum timing".
//
// The drum shadow clock (sequencer-shadow.js) already counts drum steps on the
// audio clock. When the page's 'run' message carries play:true, the worklet
// also plays those steps from the mirror: the same mute/solo and hat choke as
// the page's triggerDrumStep(), then createDrumPlayer() for the writes.
//
// The processor calls this once per 128-frame block, before it renders. Every
// write for a step whose frame falls inside the block is applied at the
// block's first frame, so a hit lands at most one block (2.7 ms at 48 kHz)
// early. Releases due inside the block go first.

const MAX_EVENTS=256;

export function createWorkletDrums({sampleRate}){
 const player=createDrumPlayer({sampleRate,forceFilter:true});
 let playing=false;
 const stats={hits:0,auditions:0,skipped:{}};
 // Note-on/off per lane with its frame, for the page's studio trace:
 // [kind 'on'|'off', lane, note, frame, step (-1: tap or release)].
 let events=[],eventsDropped=0;
 const skip=reason=>{stats.skipped[reason]=(stats.skipped[reason]??0)+1};
 const record=event=>{
  events.push(event);
  if(events.length>MAX_EVENTS){events.shift();eventsDropped++}
 };
 // Note-offs: one per lane whose owner the player released (stop, re-hit, release).
 function released(before){
  const after=player.owners();
  for(const [laneId,owner] of Object.entries(before))
   if(after[laneId]?.token!==owner.token)record(['off',laneId,owner.note,owner.releaseAt,-1]);
 }

 function hitLane(laneId,mirror,frame,step){
  const lane=mirror?.drumLanes?.[laneId];
  const bus=mirror?.drumBuses?.[drumBusIndexForLane(laneId)];
  if(!lane){skip('no-lane');return []}
  if(!bus){skip('no-bus');return []}
  const before=player.owners();
  const result=player.hit(laneId,lane,{busFilter:bus.filter,voiceEnabled:bus.enabled,frame});
  if(!result.played){skip(result.reason);return []}
  // A re-hit or a same-chip lane ends early, at this hit's frame.
  for(const [other,owner] of Object.entries(before))
   if(player.owners()[other]?.token!==owner.token&&other!==laneId)record(['off',other,owner.note,frame,-1]);
  if(before[laneId])record(['off',laneId,before[laneId].note,frame,-1]);
  record(['on',laneId,lane.note,frame,step]);
  return result.commands;
 }
 function releaseDue(frame){
  const before=player.owners();
  const out=player.releaseDue(frame);
  released(before);
  return out;
 }
 function stopAll(atFrame){
  const before=player.owners();
  const out=player.stopAll();
  for(const [laneId,owner] of Object.entries(before))record(['off',laneId,owner.note,Math.min(owner.releaseAt,atFrame??owner.releaseAt),-1]);
  return out;
 }

 return {
  get playing(){return playing},
  /**
   * A shadow control message. 'run' with play:true starts playing; any other
   * run or a stop ends it. Returns note-offs for drums still sounding.
   */
  control(message,frame){
   if(message?.action==='sync')return [];
   const next=message?.action==='run'&&message.play===true;
   const wasPlaying=playing;
   playing=next;
   return wasPlaying&&!next?stopAll(frame):[];
  },
  /**
   * Commands for one block: releases due before blockEnd, then the steps the
   * shadow counted in it ([{frame, index}]), in order.
   */
  block(steps,mirror,blockEnd){
   const out=releaseDue(blockEnd-1);
   if(!playing||!steps.length)return out;
   const transport=mirror?.transport;
   if(!transport){skip('no-transport');return out}
   const sequence=drumSequence(transport);
   for(const {frame,index} of steps){
    const hits=drumStep({step:index},{sequence}).hits.filter(hit=>drumLaneAudible(transport,hit.lane));
    for(const hit of resolveDrumHitsOnStep(hits)){
     const commands=hitLane(hit.lane,mirror,frame,index);
     if(commands.length)stats.hits++;
     out.push(...commands);
    }
   }
   return out;
  },
  /** A grid-cell tap: plays one lane now, as the page's triggerDrumLane() does. */
  audition(laneId,mirror,frame){
   if(!DRUM_LANE_IDS.includes(laneId))throw new RangeError('drum lane '+laneId);
   const commands=hitLane(laneId,mirror,frame,-1);
   if(commands.length)stats.auditions++;
   return commands;
  },
  stopAll(frame){playing=false;return stopAll(frame)},
  /** True when note events wait to be reported. */
  get hasEvents(){return events.length>0},
  /** Counts and note events since the last call. */
  takeStats(){
   const out={hits:stats.hits,auditions:stats.auditions,skipped:{...stats.skipped},events,eventsDropped};
   stats.hits=0;stats.auditions=0;stats.skipped={};events=[];eventsDropped=0;
   return out;
  }
 };
}
