import {createDrumPlayer} from './drum-player.js?v=__BUILD_ID__';
import {drumStep} from './sequencer-steps.js?v=__BUILD_ID__';
import {drumSequence,drumLaneAudible} from './transport-state.js?v=__BUILD_ID__';
import {resolveDrumHitsOnStep} from './drum-voice-policy.js?v=__BUILD_ID__';
import {drumBusIndexForLane} from './drum-bus-engines.js?v=__BUILD_ID__';
import {DRUM_LANE_IDS} from './drum-step-sequencer.js?v=__BUILD_ID__';

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

export function createWorkletDrums({sampleRate}){
 const player=createDrumPlayer({sampleRate,forceFilter:true});
 let playing=false;
 const stats={hits:0,auditions:0,skipped:{}};
 const skip=reason=>{stats.skipped[reason]=(stats.skipped[reason]??0)+1};

 function hitLane(laneId,mirror,frame){
  const lane=mirror?.drumLanes?.[laneId];
  const bus=mirror?.drumBuses?.[drumBusIndexForLane(laneId)];
  if(!lane){skip('no-lane');return []}
  if(!bus){skip('no-bus');return []}
  const result=player.hit(laneId,lane,{busFilter:bus.filter,voiceEnabled:bus.enabled,frame});
  if(!result.played){skip(result.reason);return []}
  return result.commands;
 }

 return {
  get playing(){return playing},
  /**
   * A shadow control message. 'run' with play:true starts playing; any other
   * run or a stop ends it. Returns note-offs for drums still sounding.
   */
  control(message){
   if(message?.action==='sync')return [];
   const next=message?.action==='run'&&message.play===true;
   const wasPlaying=playing;
   playing=next;
   return wasPlaying&&!next?player.stopAll():[];
  },
  /**
   * Commands for one block: releases due before blockEnd, then the steps the
   * shadow counted in it ([{frame, index}]), in order.
   */
  block(steps,mirror,blockEnd){
   const out=player.releaseDue(blockEnd-1);
   if(!playing||!steps.length)return out;
   const transport=mirror?.transport;
   if(!transport){skip('no-transport');return out}
   const sequence=drumSequence(transport);
   for(const {frame,index} of steps){
    const hits=drumStep({step:index},{sequence}).hits.filter(hit=>drumLaneAudible(transport,hit.lane));
    for(const hit of resolveDrumHitsOnStep(hits)){
     const commands=hitLane(hit.lane,mirror,frame);
     if(commands.length)stats.hits++;
     out.push(...commands);
    }
   }
   return out;
  },
  /** A grid-cell tap: plays one lane now, as the page's triggerDrumLane() does. */
  audition(laneId,mirror,frame){
   if(!DRUM_LANE_IDS.includes(laneId))throw new RangeError('drum lane '+laneId);
   const commands=hitLane(laneId,mirror,frame);
   if(commands.length)stats.auditions++;
   return commands;
  },
  stopAll(){playing=false;return player.stopAll()},
  /** Counts since the last call. */
  takeStats(){
   const out={hits:stats.hits,auditions:stats.auditions,skipped:{...stats.skipped}};
   stats.hits=0;stats.auditions=0;stats.skipped={};
   return out;
  }
 };
}
