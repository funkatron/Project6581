import {createNoteWriter} from './note-writes.js?v=0.30.0+20261128T010628315Z';
import {drumBusVolumeForLane,drumLaneLevelGain,drumReleaseMilliseconds} from './drum-lane-trigger.js?v=0.30.0+20261128T010628315Z';
import {drumBusIndexForLane} from './drum-bus-engines.js?v=0.30.0+20261128T010628315Z';
import {drumChipForBus} from './sid-engines.js?v=0.30.0+20261128T010628315Z';
import {drumSlotFilterRegisters} from './drum-slot-filter.js?v=0.30.0+20261128T010628315Z';
import {filterRegistersFromUi} from './sid-filter-ui.js?v=0.30.0+20261128T010628315Z';

// Step 3c-1 (worklet plays the drums): one drum hit as data in, register
// commands out, so the AudioWorklet can play drum steps on its own clock.
//
// It makes the same writes, in the same order, as the page's triggerDrumLane()
// in sid-studio.js:
//   1. note-off for this lane's previous hit, then for any other lane still
//      held on the same drum chip;
//   2. the bus filter for the chip, with the volume scaled for this lane
//      (drumBusVolumeForLane), routed to voice 1 only (drum slot 0);
//   3. note-on on voice 1 of the lane's chip (SID 4 kick, 5 snare, 6 hats);
//   4. note-off after drumReleaseMilliseconds(voice), counted in frames.
// Mute/solo and the hat choke are decided per step before hit() is called,
// as the page does in triggerDrumStep(). Nothing calls this from the worklet
// yet; playback is unchanged.

/** The drum chip (3–5) a lane plays on. */
export const drumChipForLane=laneId=>drumChipForBus(drumBusIndexForLane(laneId));

/** The bus filter as written for one lane's hit (UI units: Hz, 0–100). */
export function drumHitFilter(busFilter,laneId,level){
 return {...busFilter,volume:drumBusVolumeForLane(busFilter,{level},laneId)};
}

/** Frames from note-on to the drum's note-off. */
export function drumReleaseFrames(voice,sampleRate){
 if(!(sampleRate>0))throw new RangeError('sample rate');
 return Math.round(drumReleaseMilliseconds(voice)*sampleRate/1000);
}

/**
 * @param {{sampleRate:number, writer?:ReturnType<typeof createNoteWriter>, forceFilter?:boolean}} options
 * writer defaults to a new note writer; drum chips do not use the melodic
 * voice budget, so its instrument settings do not matter here.
 * forceFilter writes all four filter registers on every hit. The worklet sets
 * it because the page still writes SID 4–6 filters (engine card edits, LFO
 * updates), so this writer's record of them can be stale.
 */
export function createDrumPlayer({sampleRate,writer=createNoteWriter(),forceFilter=false}={}){
 if(!(sampleRate>0))throw new RangeError('sample rate');
 const owners=new Map();// laneId → {note, token, chip, releaseAt}

 function release(laneId,out){
  const owner=owners.get(laneId);
  if(!owner)return;
  owners.delete(laneId);
  out.push(...writer.noteOff(owner.note,owner.token));
 }
 // The controller reports a drum note it had to evict; drop the owner
 // without a second note-off, as clearDrumOwnersForMidiNote() does on the page.
 function forgetEvicted(commands){
  const kept=[];
  for(const command of commands){
   if(command.type!=='drum-note-evicted'){kept.push(command);continue}
   for(const [laneId,owner] of owners)if(owner.note===command.note)owners.delete(laneId);
  }
  return kept;
 }

 return {
  /**
   * Plays one lane. lane = a mirrored drum lane {note, level, voice}.
   * busFilter = the drum chip's engine filter {cutoff, resonance, volume, mode}.
   * Returns {played, reason?, commands, releaseAt?}.
   */
  hit(laneId,lane,{busFilter,frame=0,voiceEnabled=true}={}){
   const chip=drumChipForLane(laneId);
   if(!lane||drumLaneLevelGain(lane)<=0)return {played:false,reason:'silent',commands:[]};
   if(!voiceEnabled)return {played:false,reason:'voice-disabled',commands:[]};
   if(!busFilter)throw new TypeError('bus filter');
   const out=[];
   release(laneId,out);
   for(const [other,owner] of [...owners])if(owner.chip===chip)release(other,out);
   const filter=filterRegistersFromUi(drumHitFilter(busFilter,laneId,lane.level));
   out.push(...writer.setFilter(drumSlotFilterRegisters(filter,0),chip,{force:forceFilter}));
   writer.setSettings(chip,{...lane.voice,pitchEnvelope:lane.voice.pitchEnvelope});
   const on=writer.noteOn(lane.note,{chipMask:[chip],layerChip:chip,drumSlot:0});
   out.push(...forgetEvicted(on.commands));
   const releaseAt=frame+drumReleaseFrames(lane.voice,sampleRate);
   owners.set(laneId,{note:lane.note,token:on.token,chip,releaseAt});
   return {played:true,commands:out,releaseAt};
  },
  /** Note-offs for every hit whose release frame is at or before `frame`, earliest first. */
  releaseDue(frame){
   const due=[...owners].filter(([,owner])=>owner.releaseAt<=frame)
    .sort((a,b)=>a[1].releaseAt-b[1].releaseAt);
   const out=[];
   for(const [laneId] of due)release(laneId,out);
   return out;
  },
  /** The earliest pending release frame, or null. */
  nextReleaseAt(){
   let next=null;
   for(const owner of owners.values())if(next===null||owner.releaseAt<next)next=owner.releaseAt;
   return next;
  },
  /** Note-offs for all held drum hits (transport stop). */
  stopAll(){
   const out=[];
   for(const laneId of [...owners.keys()])release(laneId,out);
   return out;
  },
  owners(){return Object.fromEntries([...owners].map(([laneId,owner])=>[laneId,{...owner}]))}
 };
}
