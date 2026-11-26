import test from 'node:test';
import assert from 'node:assert/strict';
import {UnisonSidController} from '../src/unison-sid-controller.js';
import {createDrumPlayer,drumChipForLane,drumHitFilter,drumReleaseFrames} from '../src/drum-player.js';
import {drumBusIndexForLane} from '../src/drum-bus-engines.js';
import {drumChipForBus,createDefaultEngines} from '../src/sid-engines.js';
import {drumBusVolumeForLane,drumLaneLevelGain,drumLaneTimbre,drumReleaseMilliseconds} from '../src/drum-lane-trigger.js';
import {drumSlotFilterRegisters} from '../src/drum-slot-filter.js';
import {filterRegistersFromUi} from '../src/sid-filter-ui.js';
import {resolveDrumHitsOnStep} from '../src/drum-voice-policy.js';
import {defaultDrumKit,validateDrumKit} from '../src/drum-step-sequencer.js';
import {FACTORY_PRESETS} from '../src/preset-library.js';
import {simplePitchEnvelope} from '../src/pitch-envelope.js';

const SAMPLE_RATE=48000;

// Same arithmetic create-residfp-audio.js uses for pitch-envelope messages.
const pageRegister=slot=>Math.floor(slot/3)*0x20+(slot%3)*7;
const pageFrequency=note=>Math.max(0,Math.min(65535,Math.round(440*2**((note-69)/12)*16777216/985248)));

/** The drum kit as the page mirrors it: {laneId: {note, level, voice}} (syncWorkletMirror). */
function mirroredLanes(kit){
 const lanes={};
 for(const [laneId,lane] of Object.entries(validateDrumKit(kit).lanes)){
  const factory=FACTORY_PRESETS.find(preset=>preset.id===lane.presetId);
  const {voice}=drumLaneTimbre(factory.settings,lane);
  lanes[laneId]={note:Math.max(0,Math.min(127,lane.midiNote+(lane.pitchOffsetSemitones??0))),level:lane.level,voice};
 }
 return lanes;
}

/**
 * The page's drum path, line for line from sid-studio.js: triggerDrumLane,
 * stopDrumOwner, applyDrumChipFilter (with its per-chip stamp),
 * applyDrumEngineFilterForLane, clearDrumOwnersForMidiNote and the release
 * setTimeout. Timers are recorded, not run, so the test can fire them in order.
 */
function pageDrums(engines,lanes){
 let commands=[];
 const activeOwners=new Map(),timers=new Map();
 const clearOwnersForNote=note=>{
  for(const [key,owner] of [...activeOwners])if(owner.note===note){timers.delete(key);activeOwners.delete(key)}
 };
 const sidController=new UnisonSidController((register,value)=>commands.push({type:'write',register,value}),{
  onPitchStart:(slot,note,envelope)=>commands.push({type:'pitch-envelope-start',register:pageRegister(slot),
   baseFrequency:pageFrequency(note),points:envelope.points,interpolation:envelope.interpolation,end:envelope.end}),
  onPitchRetune:(slot,note)=>commands.push({type:'pitch-envelope-retune',register:pageRegister(slot),baseFrequency:pageFrequency(note)}),
  onPitchStop:slot=>commands.push({type:'pitch-envelope-stop',register:pageRegister(slot)}),
  onDrumNoteEvicted:note=>clearOwnersForNote(note)
 });
 const stamp=['','','','','',''];
 const stopDrumOwner=key=>{
  timers.delete(key);
  const owner=activeOwners.get(key);
  if(!owner)return;
  activeOwners.delete(key);
  sidController.noteOff(owner.note,owner.token);
 };
 const applyDrumChipFilter=(chip,overrides)=>{
  const filter={...engines[chip].filter,...overrides};
  const next=[filter.cutoff,filter.resonance,filter.volume,filter.mode].join(':');
  if(stamp[chip]===next)return;
  stamp[chip]=next;
  sidController.setFilter(drumSlotFilterRegisters(filterRegistersFromUi(filter),0),chip);
 };
 const triggerDrumLane=(laneId,atMs)=>{
  const lane=lanes[laneId];
  if(!lane||drumLaneLevelGain(lane)<=0)return null;
  const chip=drumChipForBus(drumBusIndexForLane(laneId));
  if(!engines[chip].voice.enabled)return null;
  const key='drum:'+laneId;
  commands=[];
  stopDrumOwner(key);
  for(const [other,owner] of [...activeOwners])if(owner.chip===chip)stopDrumOwner(other);
  applyDrumChipFilter(chip,{volume:drumBusVolumeForLane(engines[chip].filter,lane,laneId)});
  const settings={...lane.voice,pitchEnvelope:lane.voice.pitchEnvelope};
  const token=sidController.noteOn(lane.note,()=>settings,{chipMask:[chip],layerChip:chip,drumSlot:0});
  activeOwners.set(key,{note:lane.note,token,chip});
  timers.set(key,{at:atMs+drumReleaseMilliseconds(lane.voice),token});
  return commands;
 };
 return {
  triggerDrumStep(rawHits,atMs){
   return resolveDrumHitsOnStep(rawHits).map(hit=>[hit.lane,triggerDrumLane(hit.lane,atMs)]);
  },
  /** Fires release timers due by atMs, earliest first; returns their writes. */
  releaseDue(atMs){
   commands=[];
   const due=[...timers].filter(([,timer])=>timer.at<=atMs).sort((a,b)=>a[1].at-b[1].at);
   for(const [key,timer] of due)if(activeOwners.get(key)?.token===timer.token)stopDrumOwner(key);
   return commands;
  },
  owners(){return Object.fromEntries([...activeOwners].map(([key,owner])=>[key.slice(5),owner.note]))}
 };
}

/** Runs a step script on the page model and the worklet player; every write must match. */
function assertParity({engines=createDefaultEngines(),lanes=mirroredLanes(defaultDrumKit()),steps}){
 const page=pageDrums(engines,lanes);
 const player=createDrumPlayer({sampleRate:SAMPLE_RATE});
 const msToFrame=ms=>Math.round(ms*SAMPLE_RATE/1000);
 steps.forEach(([atMs,laneIds],index)=>{
  const label='step '+index+' @'+atMs+' ms';
  // Releases due before this step's hits, as page timers and worklet blocks both run them first.
  assert.deepEqual(player.releaseDue(msToFrame(atMs)),page.releaseDue(atMs),label+' releases');
  const pageHits=page.triggerDrumStep(laneIds.map(lane=>({lane})),atMs);
  for(const [laneId,expected] of pageHits){
   const chip=drumChipForLane(laneId);
   const result=player.hit(laneId,lanes[laneId],{busFilter:engines[chip].filter,voiceEnabled:engines[chip].voice.enabled,frame:msToFrame(atMs)});
   assert.equal(result.played,expected!==null,label+' '+laneId+' played');
   assert.deepEqual(result.commands,expected??[],label+' '+laneId);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(player.owners()).map(([lane,owner])=>[lane,owner.note])),page.owners(),label+' owners');
 });
}

test('factory kit: a two-bar groove writes the same registers as the page', () => {
 const groove=[['kick','ch'],['ch'],['sn','ch'],['oh'],['kick','ch'],['kick'],['sn','oh'],['ch'],
  ['kick','ch','oh'],['ch'],['sn','ch'],['ch'],['kick'],['kick','sn'],['sn','ch'],['oh']];
 // 125 ms per 1/16 at 120 BPM; long enough that some releases land between steps.
 const steps=[...groove,...groove].map((lanes,i)=>[i*125,lanes]);
 assertParity({steps});
});

test('fast steps re-hit lanes before their release, and hats choke each other on SID 6', () => {
 const steps=[[0,['kick','sn','oh']],[30,['kick','ch']],[60,['oh']],[61,['ch']],[400,[]],[401,['sn']],[2000,[]]];
 assertParity({steps});
});

test('lane levels change the bus filter volume; a zero level skips the hit', () => {
 const lanes=mirroredLanes(defaultDrumKit());
 lanes.kick={...lanes.kick,level:55};
 lanes.sn={...lanes.sn,level:0};
 lanes.ch={...lanes.ch,level:100};
 assertParity({lanes,steps:[[0,['kick','sn','ch']],[125,['kick','sn']],[250,['oh']],[375,['ch']]]});
});

test('edited bus filters, a disabled drum chip, and a pitch envelope match too', () => {
 const engines=createDefaultEngines();
 engines[3].filter={...engines[3].filter,cutoff:400,resonance:20,mode:'bandpass'};
 engines[4].voice={...engines[4].voice,enabled:false};
 const lanes=mirroredLanes(defaultDrumKit());
 lanes.kick={...lanes.kick,voice:{...lanes.kick.voice,pitchEnvelope:simplePitchEnvelope(true,-24,90)}};
 assertParity({engines,lanes,steps:[[0,['kick','sn']],[50,['kick']],[300,['sn','ch']],[600,[]]]});
});

test('drumHitFilter scales only the volume, with the kick boost', () => {
 const bus={cutoff:2583,resonance:100,volume:80,mode:'lowpass'};
 assert.deepEqual(drumHitFilter(bus,'kick',50),{...bus,volume:44});
 assert.deepEqual(drumHitFilter(bus,'sn',50),{...bus,volume:40});
});

test('drumReleaseFrames converts the page release time at the audio rate', () => {
 const voice={attack:0.002,decay:0.12,release:0.05};
 assert.equal(drumReleaseMilliseconds(voice),172);
 assert.equal(drumReleaseFrames(voice,48000),8256);
 assert.equal(drumReleaseFrames(voice,44100),7585);
 assert.throws(()=>drumReleaseFrames(voice,0),RangeError);
});

test('releaseDue, nextReleaseAt and stopAll', () => {
 const lanes=mirroredLanes(defaultDrumKit());
 const engines=createDefaultEngines();
 const player=createDrumPlayer({sampleRate:SAMPLE_RATE});
 const opts=laneId=>({busFilter:engines[drumChipForLane(laneId)].filter});
 assert.equal(player.nextReleaseAt(),null);
 const kick=player.hit('kick',lanes.kick,{...opts('kick'),frame:1000});
 const sn=player.hit('sn',lanes.sn,{...opts('sn'),frame:2000});
 assert.equal(player.nextReleaseAt(),Math.min(kick.releaseAt,sn.releaseAt));
 assert.deepEqual(player.releaseDue(Math.min(kick.releaseAt,sn.releaseAt)-1),[]);
 const off=player.stopAll();
 assert.ok(off.some(c=>c.type==='write'&&c.register===0x64&&(c.value&1)===0),'kick gate off on SID 4');
 assert.ok(off.some(c=>c.type==='write'&&c.register===0x84&&(c.value&1)===0),'snare gate off on SID 5');
 assert.deepEqual(player.owners(),{});
 assert.equal(player.nextReleaseAt(),null);
 assert.throws(()=>createDrumPlayer({sampleRate:0}),RangeError);
});
