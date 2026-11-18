import {createSidEventLog} from './sid-event-log.js?v=__BUILD_ID__';
import {createStudioTraceLog} from './studio-trace-log.js?v=__BUILD_ID__';
import {mountDiagnosticsPanel} from './diagnostics-panel.js?v=__BUILD_ID__';
import {formatActiveSidStatus,formatPlaybackLatencyStatus,formatSidProgressMessage,shouldShowSidUnlock,sidLedAriaLabel,sidLedState} from './sid-engine-status-ui.js?v=__BUILD_ID__';
import {canDispatchNote,needsAudioResume,shouldBlockMusicalInput} from './sid-note-gate.js?v=__BUILD_ID__';
import {closeSidContext} from './sid-audio-lifecycle.js?v=__BUILD_ID__';
import {createArpKeyVisual} from "./arp-key-visual.js?v=__BUILD_ID__";
import {modulationTrack,formatControlValue,SLIDER_TARGETS} from "./modulation-track.js?v=__BUILD_ID__";
import {lfosForEngine,LFO_TARGET_ORDER,LFO_TARGET_LABELS} from "./lfo-modulation.js?v=__BUILD_ID__";
import {createSidRecorder,prepareRecordingDownload} from "./sid-recorder.js?v=__BUILD_ID__";
import {defaultSequence,validateSequence} from "./game-step-sequencer.js?v=__BUILD_ID__";
import {mountPerformance} from "./performance-play.js?v=__BUILD_ID__";
import {FACTORY_PRESETS,presetLoadRequiresSilence,STARTUP_FACTORY_PRESET_ID,validatePresetSettings} from "./preset-library.js?v=__BUILD_ID__";
import {mountPresetLibrary} from "./preset-library-ui.js?v=__BUILD_ID__";
import {mountKeyboard} from "./keyboard-input.js?v=__BUILD_ID__";
import {readScaleStateFromDom,resolvePerformanceNote,isPitchInScale} from "./western-scales.js?v=__BUILD_ID__";
import {DEFAULT_PITCH_ENVELOPE,validatePitchEnvelope} from "./pitch-envelope.js?v=__BUILD_ID__";
import {mountEditorTabs} from "./editor-tabs.js?v=__BUILD_ID__";
import {mountDrumPanelShell} from "./drum-panel-ui.js?v=__BUILD_ID__";
import {mountDrumPerformance} from "./drum-performance.js?v=__BUILD_ID__";
import {defaultDrumKit,defaultDrumSequence,validateDrumKit,validateDrumSequence} from "./drum-step-sequencer.js?v=__BUILD_ID__";
import {DRUM_ENGINE_INDEX} from "./sid-engines.js?v=__BUILD_ID__";
import {drumOwnerKey,drumLaneTimbre,drumReleaseMilliseconds,isDrumOwner} from "./drum-lane-trigger.js?v=__BUILD_ID__";
import {mountGeneratorLeds} from "./generator-led-ui.js?v=__BUILD_ID__";
import {createPerformanceArpState} from "./performance-arp-state.js?v=__BUILD_ID__";
import {createPerformanceRoutingState} from "./performance-routing-state.js?v=__BUILD_ID__";
import {createPerformanceInstrumentState} from "./performance-instrument-state.js?v=__BUILD_ID__";
import {setLayoutInert} from "./ui-layout.js?v=__BUILD_ID__";
import {mountLfoPanel} from "./lfo-panel-ui.js?v=__BUILD_ID__";
import {mountAudioTimingPanel} from "./audio-timing-panel.js?v=__BUILD_ID__";
import {applyFirstEnergyTiming} from "./audio-timing-metrics.js?v=__BUILD_ID__";
import {createDefaultEngines,clampVoiceCount,maxVoicesForEngines,DEFAULT_ROUTING,routeMask,routingKeyForSource} from "./sid-engines.js?v=__BUILD_ID__";
import {mountSidEnginePanels} from "./sid-engine-panels-ui.js?v=__BUILD_ID__";
import {mountMasterLoudnessMeter} from "./master-loudness-meter-ui.js?v=__BUILD_ID__";
import {mountHelpDialog,mountHelpTriggers} from "./ui-help-dialog.js?v=__BUILD_ID__";
import {mountMidiInput} from "./midi-input.js?v=__BUILD_ID__";
import {mountPreferencesDialog} from "./studio-preferences-ui.js?v=__BUILD_ID__";
import {bindHelpGesture} from "./ui-help-gesture.js?v=__BUILD_ID__";

export function startSidStudio(){
const $=id=>document.getElementById(id);
const sidStartupLog=[];
const sidEventLog=createSidEventLog();
const studioTrace=createStudioTraceLog();
let sidInputEvent=null;
const audioTiming={source:null,roundTripMs:null,renderAvgMs:null,renderMaxMs:null,renderBudgetMs:null,baseMs:null,outputMs:null,
 keyAt:null,keyEnergyMs:null,keyBufferRemainderMs:null,keyToOutputEstimateMs:null,keyEnergyMissed:false,probeSkipped:false};
let sidController=null,sidAudio=null,sidContext=null,sidStarting=false;let sidKeys=0;let modulation=null;let lfoTimer=null;let lfoStarted=performance.now();let sidRecorder=null,recordTimer=null,recordBusy=false,recordDownloadUrl=null,activeSidModel=null;
const {updateAudioTimingReport}=mountAudioTimingPanel({
 $,sidEventLog,audioTiming,sidStartupLog,
 getSidAudio:()=>sidAudio,getSidContext:()=>sidContext,
 getReportContext:()=>({
  build:$('buildInfo').textContent,browser:navigator.userAgent,route:location.pathname,
  selectedSidModel:Number($('chip').value),activeSidModel,
  contextState:sidContext?.state??'unavailable',sampleRate:sidContext?.sampleRate??null,
  baseLatencyMs:Number.isFinite(sidContext?.baseLatency)?sidContext.baseLatency*1000:null,
  outputLatencyMs:Number.isFinite(sidContext?.outputLatency)?sidContext.outputLatency*1000:null,
  timing:{...audioTiming},startup:[...sidStartupLog]
 })
});
const diagnosticsUi=mountDiagnosticsPanel({
 $,studioTrace,sidEventLog,getReportContext:()=>({
  build:$('buildInfo').textContent,browser:navigator.userAgent,route:location.pathname,
  selectedSidModel:Number($('chip').value),activeSidModel,
  contextState:sidContext?.state??'unavailable',sampleRate:sidContext?.sampleRate??null,
  baseLatencyMs:Number.isFinite(sidContext?.baseLatency)?sidContext.baseLatency*1000:null,
  outputLatencyMs:Number.isFinite(sidContext?.outputLatency)?sidContext.outputLatency*1000:null,
  timing:{...audioTiming},startup:[...sidStartupLog]
 }),updateAudioTimingReport
});
function traceStudio(type,details={}){
 studioTrace.add(type,details);
 if(diagnosticsUi.isVisible?.())diagnosticsUi.refresh();
}
function traceInput(note,source,action,run){
 traceStudio('input',{note,source,action});
 if(!sidEventLog.enabled)return run();
 const previous=sidInputEvent;
 sidInputEvent=sidEventLog.begin('input',{note,source,action,contextState:sidContext?.state??'unavailable'});
 try{return run()}finally{sidInputEvent=previous;diagnosticsUi.afterNoteEvent?.()}
}
function sidMusicalInputBlocked(){
 return shouldBlockMusicalInput({
  pendingStartup:Boolean(pendingSidStartup),
  pendingClose:Boolean(pendingSidClose),
  presetLoading,
  starting:sidStarting,
  cleanupBlocked:sidCleanupBlocked
 });
}
let sidOutputMuted=false;
function silenceSidOutput(){
 panic();
 sidController?.forceSilent();
 sidAudio?.noteDispatched?.('silence');
 sidOutputMuted=true;
}
function restoreSidOutput(){
 if(!sidOutputMuted)return;
 sidOutputMuted=false;
 updateSidFilter();
}
// Let the browser release export URLs on unload. Safari may still be resolving a download at pagehide.
const engines=createDefaultEngines(6581);
const settings=[engines[0].voice];
let currentSidSettings={...settings[0]};
const engineLiveSettings=[null,null,null,null];
const useAudioClockLfo=true;
let enginePanelsUi=null;
let chipPeakLevels=[0,0,0,0];
const masterLoudnessMeter=mountMasterLoudnessMeter($);
function updateMasterLoudnessFromLevels(masterPeak,chipPeaks){
 if(Number.isFinite(masterPeak))masterLoudnessMeter.update(masterPeak);
 else if(Array.isArray(chipPeaks)&&chipPeaks.length){
  masterLoudnessMeter.update(Math.max(...chipPeaks.map(level=>Number(level)||0)));
 }
}
function syncLegacyFilterInputs(){
 const filter=engines[0].filter;
 $('chip').value=String(engines[0].model);
 $('volume').value=String(filter.volume);
 $('cutoff').value=String(filter.cutoff);
 $('resonance').value=String(filter.resonance);
 $('mode').value=filter.mode;
}
function syncVoiceCountOptions(){
 const max=maxVoicesForEngines();
 const select=$('voiceCount');
 const value=clampVoiceCount(select.value);
 select.replaceChildren();
 for(let option=1;option<=max;option++){
  const el=document.createElement('option');
  el.value=String(option);el.textContent=String(option);
  select.append(el);
 }
 select.value=String(value);
}
function syncUnisonCountOptions(){
 const voices=clampVoiceCount($('voiceCount')?.value??1);
 const select=$('unisonCount');
 if(!select)return;
 const max=maxVoicesForEngines();
 if(select.options.length!==max){
  select.replaceChildren();
  for(let option=1;option<=max;option++){
   const el=document.createElement('option');
   el.value=String(option);el.textContent=String(option);
   select.append(el);
  }
 }
 const layers=Math.max(1,Math.min(voices,Math.round(Number(select.value)||1)));
 for(const option of select.options)option.disabled=Number(option.value)>voices;
 const next=String(layers);
 if(select.value!==next)select.value=next;
}
let unisonUpdating=false;
let pendingUnisonFrame=null;
function scheduleUnisonFollowUp(run){
 if(pendingUnisonFrame!=null)cancelAnimationFrame(pendingUnisonFrame);
 pendingUnisonFrame=requestAnimationFrame(()=>{
  pendingUnisonFrame=null;
  run();
 });
}
function syncEnginePans(){
 for(let chip=0;chip<engines.length;chip++)sidAudio?.setPan?.(chip,engines[chip].pan);
}
function syncEngineChipGains(){
 for(let chip=0;chip<engines.length;chip++){
  const db=chip===3?(engines[chip].outputBoostDb??6):0;
  sidAudio?.setChipGain?.(chip,db);
 }
}
async function syncEngineChipModels(){
 if(!sidAudio?.setChipModel)return;
 // createReSidFpAudio tracks one in-flight setChipModel at a time.
 for(let chip=0;chip<engines.length;chip++)await sidAudio.setChipModel(chip,engines[chip].model);
}
const ranges=[['attack','Attack',0,2,.01],['decay','Decay',0,3,.01],['sustain','Sustain',0,1,.01],['release','Release',.01,4,.01],['pulse','Pulse width',5,95,1],['pwmDepth','PWM depth',0,45,1],['pwmRate','PWM rate (Hz)',.1,12,.1]];
enginePanelsUi=mountSidEnginePanels({
 $,engines,getEngines:()=>engines,ranges,formatControlValue,
 getMeterLevels:()=>chipPeakLevels,
 onEngineChange:(_index,kind)=>{
  syncLegacyFilterInputs();
  syncEnginePans();
  syncEngineChipGains();
  if(kind==='model'){
   if(_index===0){
    $('chip').value=String(engines[0].model);
    void ensureSidModel(engines[0].model);
   }else if(sidAudio){
    sidAudio.setChipModel(_index,engines[_index].model).catch(()=>{});
   }
  }
  refreshPresetDirty();
  updateModulation();
 }
});
syncVoiceCountOptions();
syncUnisonCountOptions();
const lfoState=Array.from({length:3},(_,i)=>({enabled:false,sync:false,wave:'sine',rate:1,syncDivision:4,depth:0,target:'cutoff',engines:'all',phase:0,seed:i}));
const syncedRates=[{value:0.25,label:'4/1'},{value:0.5,label:'2/1'},...([1,2,4,8,16,32].map(value=>({value,label:'1/'+value})))];
const {renderLfos}=mountLfoPanel({$,lfoState,lfoTargets:LFO_TARGET_ORDER,lfoTargetNames:LFO_TARGET_LABELS,syncedRates,onChange:()=>{updateModulation();syncModulationUiLoop()}});
const editorTabs=mountEditorTabs({$});
mountDrumPanelShell({$});
const helpUi=mountHelpDialog($);
mountHelpTriggers($,{openHelp:helpUi.openHelp});
const performanceArp=createPerformanceArpState($);
const performanceRouting=createPerformanceRoutingState($,{onChange:()=>refreshPresetDirty()});
const performanceInstrument=createPerformanceInstrumentState($,{
 onChange:()=>{refreshPresetDirty();updateUnison()},
 formatDetune:value=>formatControlValue('detune',value)
});
mountGeneratorLeds($,{performanceArp,onGeneratorToggle:()=>refreshPresetDirty()});
for(const [id,helpId] of [['rootArpTitle','root-arp'],['gameArpTitle','game-arp']]){
 const el=$(id);
 if(el)bindHelpGesture(el,{helpId,$});
}
const activeOwners=new Map();
function voiceSettingsForSlot(slot){
 const chip=Math.floor(slot/3);
 const live=engineLiveSettings[chip];
 if(live)return live;
 if(chip===0)return currentSidSettings;
 const voice=engines[chip].voice;
 return {...voice,pitchEnvelope:voice.pitchEnvelope};
}
function routingSelectForSource(source){
 const key=routingKeyForSource(source);
 return performanceRouting.getState()[key];
}
function filterRegistersFromUi(filter){
 const hz=Number(filter.cutoff);
 const cutoff=Math.round(Math.max(0,Math.min(1,(hz-50)/9950))*2047);
 const resonancePct=Number(filter.resonance);
 const volumePct=Number(filter.volume);
 const mode=filter.mode??'lowpass';
 return {cutoff,resonance:Math.round(resonancePct*15/100),mode,volume:Math.round(volumePct*15/100)};
}
function clearDrumReleaseTimer(ownerKey){
 const pending=drumReleaseTimers.get(ownerKey);
 if(pending===undefined)return;
 clearTimeout(pending);
 drumReleaseTimers.delete(ownerKey);
}
function stopDrumOwner(ownerKey){
 clearDrumReleaseTimer(ownerKey);
 const owner=activeOwners.get(ownerKey);
 if(!owner)return;
 activeOwners.delete(ownerKey);
 sidController?.noteOff(owner.note,owner.token);
 traceStudio('note-off',{note:owner.note,source:ownerKey});
}
function stopDrumVoices(){
 for(const key of [...activeOwners.keys()])if(isDrumOwner(key))stopDrumOwner(key);
}
function triggerDrumLane(laneId){
 if(!sidController)return;
 const kit=validateDrumKit(drumKit);
 const lane=kit.lanes[laneId];
 if(!lane)return;
 const factory=FACTORY_PRESETS.find(preset=>preset.id===lane.presetId);
 if(!factory)return;
 restoreSidOutput();
 const {voice,filter}=drumLaneTimbre(factory.settings,lane);
 const ownerKey=drumOwnerKey(laneId);
 const note=lane.midiNote;
 const gate=canDispatchNote({
  blocked:sidMusicalInputBlocked(),
  hasController:Boolean(sidController),
  voiceEnabled:Boolean(engines[DRUM_ENGINE_INDEX]?.voice?.enabled),
  contextState:sidContext?.state??null
 });
 if(!gate.ok){
  traceStudio('note-skipped',{note,source:ownerKey,reason:gate.reason});
  return;
 }
 stopDrumOwner(ownerKey);
 sidController.setFilter(filterRegistersFromUi(filter),DRUM_ENGINE_INDEX);
 const settings={...voice,pitchEnvelope:voice.pitchEnvelope};
 const traceStart=sidAudio?.beginNoteTrace();
 const token=sidController.noteOn(note,()=>settings,{chipMask:[DRUM_ENGINE_INDEX],layerChip:DRUM_ENGINE_INDEX});
 sidAudio?.endNoteTrace(null,traceStart);
 sidAudio?.noteDispatched?.('drum');
 activeOwners.set(ownerKey,{note,token});
 traceStudio('note-on',{note,source:ownerKey,chipMask:[DRUM_ENGINE_INDEX]});
 diagnosticsUi.afterNoteEvent?.();
 const releaseMs=drumReleaseMilliseconds(voice);
 clearDrumReleaseTimer(ownerKey);
 drumReleaseTimers.set(ownerKey,setTimeout(()=>{
  if(activeOwners.get(ownerKey)?.token!==token)return;
  stopDrumOwner(ownerKey);
  diagnosticsUi.afterNoteEvent?.();
 },releaseMs));
}
function playOne(note,ownerKey,chipMask,{layer=false}={}){
 const eventId=sidEventLog.enabled?sidEventLog.begin('note-command',{note,source:ownerKey,action:'on',inputEventId:sidInputEvent,stepIndex:ownerKey==='game'&&activeSeqStep>=0?activeSeqStep:null,contextState:sidContext?.state??'unavailable',chipMask}):null;
 const gate=canDispatchNote({
  blocked:sidMusicalInputBlocked(),
  hasController:Boolean(sidController),
  voiceEnabled:chipMask.some(chip=>engines[chip]?.voice?.enabled),
  contextState:sidContext?.state??null
 });
 if(!gate.ok){
  traceStudio('note-skipped',{note,source:ownerKey,reason:gate.reason});
  if(eventId!==null)sidEventLog.add('note-skipped',{eventId,reason:gate.reason,contextState:sidContext?.state??'unavailable'});
  diagnosticsUi.afterNoteEvent?.();
  return;
 }
 const traceStart=sidAudio?.beginNoteTrace();
 const prior=activeOwners.get(ownerKey);
 if(prior)sidController.noteOff(prior.note,prior.token);
 const layerChip=layer&&chipMask.length===1?chipMask[0]:null;
 const token=sidController.noteOn(note,voiceSettingsForSlot,{chipMask,layerChip});
 sidAudio?.endNoteTrace(eventId,traceStart);
 sidAudio?.noteDispatched?.(ownerKey.startsWith('key:')?'keyboard':ownerKey.split('@')[0]);
 activeOwners.set(ownerKey,{note,token});
 traceStudio('note-on',{note,source:ownerKey,chipMask});
 diagnosticsUi.afterNoteEvent?.();
}
function dispatchUsesLayer(route,source,chips){
 if(route==='layer')return true;
 if(route!=='all'||chips.length<=1)return false;
 const root=typeof source==='string'&&source.includes('@')?source.slice(0,source.lastIndexOf('@')):source;
 if(root==='keyboard'||root.startsWith('key:'))return false;
 return root==='arp'||root==='game';
}
function play(note,source='key:'+note){
 note=resolvePerformanceNote(note,readScaleStateFromDom($));
 restoreSidOutput();
 const route=routingSelectForSource(source);
 const chips=routeMask(route);
 if(dispatchUsesLayer(route,source,chips)){
  const root=typeof source==='string'&&source.includes('@')?source.slice(0,source.lastIndexOf('@')):source;
  for(const chip of chips)playOne(note,root+'@'+chip,[chip],{layer:true});
  return;
 }
 playOne(note,source,chips);
}
function stop(note,source='key:'+note){
 note=resolvePerformanceNote(note,readScaleStateFromDom($));
 const eventId=sidEventLog.enabled?sidEventLog.begin('note-command',{note,source,action:'off',inputEventId:sidInputEvent}):null;
 const route=routingSelectForSource(source);
 const chips=routeMask(route);
 if(dispatchUsesLayer(route,source,chips)){
  const root=typeof source==='string'&&source.includes('@')?source.slice(0,source.lastIndexOf('@')):source;
  let stopped=false;
  for(const chip of chips){
   const key=root+'@'+chip;
   const owner=activeOwners.get(key);
   if(!owner||owner.note!==note)continue;
   const traceStart=sidAudio?.beginNoteTrace();
   activeOwners.delete(key);
   sidController?.noteOff(note,owner.token);
   sidAudio?.endNoteTrace(eventId,traceStart);
   traceStudio('note-off',{note,source:key});
   stopped=true;
  }
  if(!stopped){
   traceStudio('note-skipped',{note,source,reason:'no matching owner'});
   if(eventId!==null)sidEventLog.add('note-skipped',{eventId,reason:'no matching owner'});
  }
  diagnosticsUi.afterNoteEvent?.();
  return;
 }
 const owner=activeOwners.get(source);
 if(!owner||owner.note!==note){
  traceStudio('note-skipped',{note,source,reason:'no matching owner'});
  if(eventId!==null)sidEventLog.add('note-skipped',{eventId,reason:'no matching owner'});
  diagnosticsUi.afterNoteEvent?.();
  return;
 }
 const traceStart=sidAudio?.beginNoteTrace();
 activeOwners.delete(source);
 sidController?.noteOff(note,owner.token);
 sidAudio?.endNoteTrace(eventId,traceStart);
 traceStudio('note-off',{note,source});
 diagnosticsUi.afterNoteEvent?.();
}
function updateUnison(){
 if(unisonUpdating)return;
 unisonUpdating=true;
 try{
 const {voiceCount:voices,unisonCount:layers,mode,detune}=performanceInstrument.getState();
 if(sidController&&(sidController.voiceCount!==voices||sidController.unisonCount!==layers||sidController.mode!==mode)){
  // Assignments change only after releasing owned notes and running generators.
  traceStudio('unison-change',{voices,layers,mode,route:performanceRouting.keyboard});
  panic('unison-config');arp.held.clear();arp.latched.clear();
 }else traceStudio('unison-update',{voices,layers,mode,detune});
 sidController?.configure({voiceCount:voices,unisonCount:layers,mode,detune});
 $('detune').disabled=layers===1;
 performanceInstrument.syncDetuneDisplay();
 const max=mode==='mono'||mode==='legato'?1:mode==='duo'?Math.min(2,Math.floor(voices/layers)):Math.floor(voices/layers);
 $('voiceCapacity').textContent='Up to '+max+' '+(max===1?'note':'notes')+' · '+voices+' '+(voices===1?'oscillator':'oscillators');
 // Defer modulation and option.disabled so Safari/iPad can finish closing the native <select> picker.
 scheduleUnisonFollowUp(()=>{
  syncUnisonCountOptions();
  updateModulation();
 });
 }finally{unisonUpdating=false}
}
updateUnison();
function panic(reason=''){
 traceStudio('panic',{reason});
 releaseMidiNotes();
 gameStop();drumStop();if(arp.timer!==null){clearInterval(arp.timer);arp.timer=null}arpStopVoice();arp.root=null;directOwned.clear();activeOwners.clear();arpKeyVisual.clear();sidController?.panic()}
$('panic').addEventListener('click',()=>{
 sidEventLog.add('stop-all',{contextId:sidAudio?sidAttempt:null,model:activeSidModel});
 performanceArp.set({rootOn:false,gameOn:false});
 lfoState.forEach(lfo=>{lfo.enabled=false});renderLfos();updateModulation();stopModulationUiLoop();
 panic();arp.held.clear();arp.latched.clear();arp.step=0;game.step=0;seqPreview=false;setSeqTransportLabel();
 sidController?.panic();
 $('arpStatus').textContent='Arps and LFOs off';
});window.addEventListener('blur',()=>{
 // Native pickers can blur the window without meaning navigation away.
 if(document.activeElement?.tagName==='SELECT')return;
 panic('window-blur');arp.held.clear();seqPreview=false;setSeqTransportLabel();
});
const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const arp={held:new Set(),latched:new Set(),timer:null,step:0,root:null,last:null};
const directOwned=new Set(); // Physical notes sounding independently of either generator.
const game={timer:null,last:null,step:0,gateTimer:null};
let drumKit=validateDrumKit(defaultDrumKit());
let drumSequence=validateDrumSequence(defaultDrumSequence());
const drum={timer:null,step:0,running:false};
const drumReleaseTimers=new Map();
let drumStop=()=>{};
let seqState=defaultSequence(),seqPreview=false,activeSeqStep=-1;
let gameStop=()=>{};
let arpStopVoice=()=>{};
let restartGenerators=()=>{};
let stopGenerators=()=>{};
let gameRestart=()=>{};
let setSeqTransportLabel=()=>{};
let renderSequenceSteps=()=>{};
let loadBuiltInPhrase=()=>false;
let flushQueuedKeys=()=>{};
let keyDown=()=>{},keyUp=()=>{};
let releaseMidiNotes=()=>{};
const gameEnabled=()=>performanceArp.gameOn;
const arpEnabled=()=>performanceArp.rootOn;
const latchOn=()=>performanceArp.latchOn;
const activeNotes=()=>[...(latchOn()&&arp.latched.size?arp.latched:arp.held)];
const arpNotes=()=>{
 const state=readScaleStateFromDom($);
 const raw=activeNotes().sort((a,b)=>a-b);
 if(!state.lock||state.id==='chromatic')return raw;
 const seen=new Set(),out=[];
 for(const note of raw){
  const mapped=resolvePerformanceNote(note,state);
  if(!seen.has(mapped)){seen.add(mapped);out.push(mapped)}
 }
 return out.sort((a,b)=>a-b);
};
const keyboardState={octave:3};
const keys=new Map();
const arpKeyVisual=createArpKeyVisual({getKey:note=>keys.get(note)});
const performanceNote=note=>resolvePerformanceNote(note,readScaleStateFromDom($));
({gameStop,arpStopVoice,restartGenerators,stopGenerators,gameRestart,setSeqTransportLabel,renderSequenceSteps,loadBuiltInPhrase}=mountPerformance({
 $,names,keyboardState,arp,game,directOwned,play,stop,silenceSidOutput,refreshPresetDirty,
 getArpKeyVisual:()=>arpKeyVisual,performanceNote,
 gameEnabled,arpEnabled,activeNotes,arpNotes,
 getSeqState:()=>seqState,
 setSeqState:value=>{seqState=value},
 isSeqPreview:()=>seqPreview,
 setSeqPreview:value=>{seqPreview=value},
 getActiveSeqStep:()=>activeSeqStep,
 setActiveSeqStep:value=>{activeSeqStep=value},
 performanceArp
}));
({drumStop}=mountDrumPerformance({
 $,drum,
 getDrumSequence:()=>drumSequence,
 getMasterBpm:()=>Number($('masterBpm').value),
 triggerDrumLane,
 stopDrumVoices,
 refreshPresetDirty
}));
let renderKeyboard=()=>{};
({flushQueuedKeys,keyDown,keyUp,renderKeyboard}=mountKeyboard({
 $,keys,names,keyboardState,audioTiming,sidEventLog,
 getSidContext:()=>sidContext,
 sidMusicalInputBlocked,armSidResume,
 hasController:()=>Boolean(sidController),
 countKeyPress(){
  sidKeys++;
  $('sidPlaybackStatus').textContent='SID key presses: '+sidKeys+' · waiting for audio samples…';
 },
 activeNotes,arp,game,gameEnabled,arpEnabled,latchOn,directOwned,play,stop,restartGenerators,stopGenerators,
 gameRestart,arpStopVoice,arpNotes,performanceNote,
 isSeqPreview:()=>seqPreview,
 getScaleState:()=>readScaleStateFromDom($),
 pitchInScale:note=>isPitchInScale(note,readScaleStateFromDom($)),
 traceInput,panic,refreshPresetDirty,getArpKeyVisual:()=>arpKeyVisual
}));
for(const id of ['scaleKey','scaleId','scaleLock']){
 $(id)?.addEventListener('change',()=>{
  renderKeyboard();
  arpKeyVisual.refresh();
  refreshPresetDirty();
 });
}
mountPreferencesDialog($);
({releaseAll:releaseMidiNotes}=mountMidiInput({
 $,traceInput,keyDown,keyUp,isBlocked:sidMusicalInputBlocked,
 pitchPhysicallyHeld:note=>arp.held.has(note)||directOwned.has(note)
}));

function updateSidFilter(overrides={},engineIndex=0){
  if(!sidController)return;
  const filter=engines[engineIndex].filter;
  const hz=Number(overrides.cutoff??filter.cutoff);
  const cutoff=Math.round(Math.max(0,Math.min(1,(hz-50)/9950))*2047);
  const resonancePct=Number(overrides.resonance??filter.resonance);
  const volumePct=Number(overrides.volume??filter.volume);
  const mode=overrides.mode??filter.mode;
  if(useAudioClockLfo)return;
  sidController.setFilter({
    cutoff,resonance:Math.round(resonancePct*15/100),
    mode,volume:Math.round(volumePct*15/100)
  },engineIndex);
}
function pushAudioModulationConfig(){
 if(!sidAudio?.setModulationConfig)return;
 sidAudio.setModulationConfig({
  bpm:Number($('masterBpm').value),
  engines:engines.map(engine=>({filter:{...engine.filter},voice:{wave:engine.voice.wave}})),
  lfos:lfoState.map(lfo=>({...lfo,engines:lfo.engines??'all'}))
 });
}
function modulationBaseForEngine(chip){
 const engine=engines[chip];
 return {
  cutoff:Number(engine.filter.cutoff),resonance:Number(engine.filter.resonance),volume:Number(engine.filter.volume),
  pan:Number(engine.pan),pulse:Number(engine.voice.pulse),detune:performanceInstrument.detune,
  attack:Number(engine.voice.attack),decay:Number(engine.voice.decay),sustain:Number(engine.voice.sustain),
  release:Number(engine.voice.release),pwmDepth:Number(engine.voice.pwmDepth),pwmRate:Number(engine.voice.pwmRate)
 };
}
function modulationTargetEnabled(chipLfos,values,target,pulseActive,unisonActive){
 const active=chipLfos.some(lfo=>lfo.enabled&&lfo.depth>0);
 return ((active&&chipLfos.some(lfo=>lfo.enabled&&lfo.depth>0&&lfo.target===target))
   ||(target==='pulse'&&pulseActive&&values.pwmDepth>0))
  &&(!['pulse','pwmDepth','pwmRate'].includes(target)||pulseActive)
  &&(target!=='detune'||unisonActive);
}
function modulationPresentationRoot(input,target){
 if(!input&&target==='detune')return document.querySelector('.allocation-detune');
 if(!input)return null;
 return input.closest('label')??input.closest('.param-row')??null;
}
function presentModulatedSlider(root,target,baseValue,effectiveValue,enabled){
 if(!root&&target!=='detune')return;
 let input=null;
 if(root)input=root.querySelector('[data-prop="'+target+'"],input[data-filter="'+target+'"],select[data-filter="'+target+'"]');
 if(!input&&target==='detune')input=$('detune');
 const container=modulationPresentationRoot(input,target);
 if(!container)return;
 const valueHost=container.querySelector('.param-values')??container;
 let baseDisplay=valueHost.querySelector('output:not(.modulated-value)');
 if(!baseDisplay){
  baseDisplay=document.createElement('output');baseDisplay.className='base-value';valueHost.append(baseDisplay);
 }
 baseDisplay.classList.add('base-value');
 const baseText=formatControlValue(target,baseValue);
 if(baseDisplay.textContent!==baseText)baseDisplay.textContent=baseText;
 let display=valueHost.querySelector('.modulated-value');
 if(!display){
  display=document.createElement('output');display.className='modulated-value';
  display.setAttribute('aria-label',target+' effective value');valueHost.append(display);
 }
 display.hidden=!enabled;
 if(input)setModulationTrack(input,baseValue,effectiveValue,enabled);
 if(enabled){
  const effectiveText=formatControlValue(target,effectiveValue);
  if(display.textContent!==effectiveText)display.textContent=effectiveText;
 }
}
// Overlay a noninteractive range thumb: the actual input retains the base value.
function setModulationTrack(input,base,effective,enabled){
 if(!input||input.type!=='range')return;
 let stack=input.parentElement;
 if(!stack?.classList.contains('slider-stack')){
  stack=document.createElement('span');stack.className='slider-stack';
  input.before(stack);stack.append(input);
 }
 let band=stack.querySelector('.modulation-band');
 if(!band){
  band=document.createElement('span');band.className='modulation-band';
  band.setAttribute('aria-hidden','true');stack.prepend(band);
 }
 const lo=Number(input.min),hi=Number(input.max);
 if(!Number.isFinite(lo)||!Number.isFinite(hi)||hi<=lo)return;
 const track=modulationTrack(base,effective,lo,hi,enabled);
 if(stack.style.getPropertyValue('--center')!==track.center)
  stack.style.setProperty('--center',track.center);
 if(band.style.getPropertyValue('--band-start')!==track.start)
  band.style.setProperty('--band-start',track.start);
 if(band.style.getPropertyValue('--band-end')!==track.end)
  band.style.setProperty('--band-end',track.end);
 band.hidden=!track.active;
}
function modulationUiNeeded(){
 if(lfoState.some(lfo=>lfo.enabled&&lfo.depth>0))return true;
 return engines.some(engine=>engine.voice.wave==='square'&&Number(engine.voice.pwmDepth)>0);
}
let modulationUiFrame=null;
function stopModulationUiLoop(){
 if(modulationUiFrame!==null){cancelAnimationFrame(modulationUiFrame);modulationUiFrame=null}
}
function scheduleModulationUiLoop(){
 if(modulationUiFrame!==null||!modulationUiNeeded())return;
 modulationUiFrame=requestAnimationFrame(()=>{
  modulationUiFrame=null;
  if(!modulationUiNeeded())return;
  updateModulation({uiOnly:true});
  scheduleModulationUiLoop();
 });
}
function syncModulationUiLoop(){modulationUiNeeded()?scheduleModulationUiLoop():stopModulationUiLoop()}
function updateModulation({uiOnly=false}={}){
 syncLegacyFilterInputs();
 Object.assign(settings[0],engines[0].voice);
 const unisonActive=performanceInstrument.unisonCount>1;
 const bpm=Number($('masterBpm').value);
 const effectiveLfos=lfoState.map(lfo=>lfo.sync&&modulation
  ?{...lfo,rate:modulation.syncedLfoHz(bpm,lfo.syncDivision)}:lfo);
 const time=(performance.now()-lfoStarted)/1000;
 const detuneBase={detune:performanceInstrument.detune};
 const engineModValues=new Array(engines.length);
 for(let chip=0;chip<engines.length;chip++){
  const sound=engines[chip].voice;
  const pulseActive=sound.wave==='square';
  const base=modulationBaseForEngine(chip);
  const chipLfos=lfosForEngine(effectiveLfos,chip);
  const active=chipLfos.some(lfo=>lfo.enabled&&lfo.depth>0);
  const values=active&&modulation
   ?modulation.modulate(base,chipLfos,time,{pulseActive,unisonActive}):base;
  engineModValues[chip]=values;
  const livePulse=pulseActive&&modulation
   ?modulation.pulseWithPwm(values.pulse,values.pwmDepth,values.pwmRate,time):values.pulse;
  const live={...sound,pitchEnvelope:sound.pitchEnvelope,pulse:livePulse,
   attack:values.attack,decay:values.decay,sustain:values.sustain,release:values.release};
  engineLiveSettings[chip]=live;
  if(chip===0)currentSidSettings=live;
  const card=$('sidEngines')?.querySelector('[data-engine="'+chip+'"]');
  for(const target of SLIDER_TARGETS){
   if(target==='detune')continue;
   const enabled=modulationTargetEnabled(chipLfos,values,target,pulseActive,unisonActive);
   const effective=target==='pulse'?livePulse:values[target];
   presentModulatedSlider(card,target,base[target],effective,enabled);
  }
 }
 const detuneRoot=document.querySelector('.allocation-detune');
 const globalDetuneLfos=effectiveLfos.filter(lfo=>lfo.enabled&&lfo.depth>0&&lfo.target==='detune'&&(lfo.engines??'all')==='all');
 const detuneEnabled=unisonActive&&globalDetuneLfos.length>0&&modulation;
 const globalDetune=detuneEnabled
  ?modulation.modulate({...detuneBase,cutoff:0,volume:0,resonance:0,pulse:50,attack:0,decay:0,sustain:0,release:.01,pwmDepth:0,pwmRate:1},
   globalDetuneLfos,time,{pulseActive:false,unisonActive}).detune
  :detuneBase.detune;
 presentModulatedSlider(detuneRoot,'detune',detuneBase.detune,globalDetune,detuneEnabled);
 syncModulationUiLoop();
 if(!sidController)return;
 if(uiOnly)return;
 if(useAudioClockLfo)pushAudioModulationConfig();
 else{
  for(let chip=0;chip<engines.length;chip++)updateSidFilter(engineModValues[chip],chip);
 }
 sidController.setLiveDetune(globalDetune);
 for(let chip=0;chip<engines.length;chip++){
  const live=engineLiveSettings[chip];
  const values=engineModValues[chip];
  sidController.setEnvelope(live,chip);
  if(engines[chip].voice.wave==='square')sidController.setPulse(0,live.pulse,chip);
  sidAudio?.setPan?.(chip,Math.round(values.pan));
 }
}
$('masterBpm').addEventListener('input',()=>{const n=Number($('masterBpm').value);if(!Number.isFinite(n)||n<40||n>240)return;$('masterBpmValue').textContent=String(n);updateModulation();if($('arpSync').checked)restartGenerators();});
function syncArpLocalBpmLayout(){
 setLayoutInert(document.querySelector('.arp-local-bpm'),$('arpSync').checked);
}
$('arpSync').addEventListener('change',()=>{syncArpLocalBpmLayout();restartGenerators();});
syncArpLocalBpmLayout();
['volume','cutoff','resonance','mode'].forEach(id=>$(id).addEventListener('input',updateModulation));
function updateSidLed(){
  const led=$('sidLed');
  const state=sidLedState({hasAudio:Boolean(sidAudio),contextState:sidContext?.state,starting:sidStarting});
  led.dataset.state=state;
  led.setAttribute('aria-label',sidLedAriaLabel(state));
}
let pendingSidStartup=null,sidAttempt=0,sidCleanupBlocked=false,sidContextRetired=false;
let sidProgress='';
function showSidProgress(message){
 sidProgress=message;
 $('sidEngineStatus').textContent=formatSidProgressMessage(message,sidContext?.state);
}
function updateSidActivation(){
 $('sidUnlock').hidden=!shouldShowSidUnlock({contextRetired:sidContextRetired,context:sidContext});
 updateSidLed();
}
function refreshPlaybackLatencyFooter(){
 $('sidLatencyStatus').textContent=formatPlaybackLatencyStatus(audioTiming);
}
function refreshEngineStatus(){
 if(!sidAudio||!sidContext)return;
 $('sidEngineStatus').textContent=formatActiveSidStatus(sidContext.state,activeSidModel,{afterInit:true});
 refreshPlaybackLatencyFooter();
}
async function startSid({gesture=false}={}){
  if(pendingSidStartup)return pendingSidStartup;
  if(pendingSidClose)return pendingSidClose.then(()=>startSid());
  if(sidAudio)return;
  // Never accumulate contexts after failed or stalled cleanup.
  if(sidCleanupBlocked||(sidContext&&sidContext.state!=='closed'))return;
  const attempt=++sidAttempt;
  const load=async()=>{
  const button=$('sidStart'),status=$('sidEngineStatus');
  let context=null,audio=null;
  const started=performance.now();
  const current=()=>attempt===sidAttempt;
  const trace=message=>{
    if(!current())return;
    sidStartupLog.push(Math.round(performance.now()-started)+' ms · '+message+' [context: '+(context?.state??'none')+']');
    if(sidStartupLog.length>24)sidStartupLog.shift();
    updateAudioTimingReport();
  };
  const progress=message=>{if(current()){trace(message);showSidProgress(message)}};
  sidStartupLog.length=0;
  sidStarting=true;button.disabled=true;$('sidSpinner').hidden=false;updateSidLed();
  status.textContent='Loading SID…';
  try{
    // Retry's click resumes before the first await. Page load must not:
    // an ungestured resume() can stay pending and block later presses.
    context=new AudioContext({latencyHint:'interactive'});
    sidContext=context;sidContextRetired=false;
    if(gesture)context.resume().catch(()=>{});
    context.onstatechange=()=>{
      if(!current()||sidContext!==context)return;
      trace('Audio context changed to '+context.state+'.');
      sidEventLog.add('context-state',{contextId:attempt,state:context.state,baseLatencyMs:context.baseLatency*1000,outputLatencyMs:Number.isFinite(context.outputLatency)?context.outputLatency*1000:null});
      updateSidActivation();
      if(sidStarting)showSidProgress(sidProgress);
      else if(sidAudio)refreshEngineStatus();
      flushQueuedKeys();
    };
    updateSidActivation();
    progress('Loading SID JavaScript modules…');
    let moduleTimeout;
    const modules=Promise.all([
      import('./create-residfp-audio.js?v=__BUILD_ID__'),import('./unison-sid-controller.js?v=__BUILD_ID__'),import('./lfo-modulation.js?v=__BUILD_ID__')]);
    const [{createReSidFpAudio},{UnisonSidController},lfoModule]=await Promise.race([
      modules,
      new Promise((_,reject)=>{moduleTimeout=setTimeout(()=>reject(new Error('SID JavaScript module loading timed out after 15 seconds')),15000)})
    ]).finally(()=>clearTimeout(moduleTimeout));
    let resolveReady,rejectReady,startupError=null;
    const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});
    // Attach a rejection handler immediately, including WASM-fetch failures.
    void ready.catch(()=>{});
    let timeout;
    const requestedModel=Number($('chip').value);
    audio=await createReSidFpAudio({context,eventLog:sidEventLog,contextId:attempt,model:requestedModel,onProgress:progress,onStatus:event=>{
      if(!current())return;
      if(event.type==='ready'&&event.renderer)resolveReady();
      if(event.type==='error'){
        startupError=new Error(event.message);rejectReady(startupError);
        if(!sidStarting)void failActiveSid(new Error(event.message),attempt);
        return;
      }
      if(event.type==='record-limit'){void stopAndSaveRecording();return}
      if(event.type==='latency-probe'){
        audioTiming.source=event.source;
        audioTiming.roundTripMs=event.dispatchToWorkletRoundTripMs;
        audioTiming.probeSkipped=false;
        updateAudioTimingReport();
        return;
      }
      if(event.type==='latency-probe-skipped'){
        audioTiming.probeSkipped=true;
        updateAudioTimingReport();
        return;
      }
      if(event.type==='modulation-display'){
        for(const entry of event.engines??[]){
          const chip=entry.chip;
          if(!Number.isInteger(chip)||chip<0||chip>2)continue;
          const card=$('sidEngines')?.querySelector('[data-engine="'+chip+'"]');
          if(!card)continue;
          for(const key of ['volume','cutoff','resonance']){
            const base=Number(engines[chip].filter[key]);
            const effective=Number(entry.filter?.[key]);
            if(!Number.isFinite(effective))continue;
            presentModulatedSlider(card,key,base,effective,Math.abs(effective-base)>1e-6);
          }
        }
        return;
      }
      if(event.type==='first-energy'){
        applyFirstEnergyTiming(audioTiming,event,context);
        refreshPlaybackLatencyFooter();
        if(audioTiming.keyEnergyMs!==null||audioTiming.keyEnergyMissed)updateAudioTimingReport();
        return;
      }
      if(event.type==='meter-levels'){
        if(Array.isArray(event.chipPeaks))chipPeakLevels=event.chipPeaks;
        enginePanelsUi?.updateMeters(chipPeakLevels);
        updateMasterLoudnessFromLevels(event.masterPeak,chipPeakLevels);
        return;
      }
      if(event.type==='audio-stats'){
        audioTiming.renderAvgMs=event.renderAvgMs;
        audioTiming.renderMaxMs=event.renderMaxMs;
        audioTiming.renderBudgetMs=event.renderBudgetMs;
        if($('audioTimingDetails').open)updateAudioTimingReport();
        const peak=(event.peak*100).toFixed(2);
        if(Array.isArray(event.chipPeaks))chipPeakLevels=event.chipPeaks;
        enginePanelsUi?.updateMeters(chipPeakLevels);
        if(Number.isFinite(event.peak))updateMasterLoudnessFromLevels(event.peak,chipPeakLevels);
        $('sidPlaybackStatus').textContent='SID key presses: '+sidKeys+' · register writes (recent): '+event.writes+' · audio peak: '+peak+'%';
      }
    }});
    timeout=setTimeout(()=>rejectReady(new Error('SID initialization timed out at: '+sidProgress+' (context: '+context.state+')')),12000);
    try{await ready;if(startupError)throw startupError}finally{clearTimeout(timeout)}
    panic();sidAudio=audio;sidKeys=0;modulation=lfoModule;updateSidLed();
    audio.setKeyLatencyMeasureEnabled(true);
    audio.setTimingEnabled($('audioTimingDetails').open);
    audio.setEventLogging(sidEventLog.enabled);
    sidRecorder=createSidRecorder(audio);
    $('recordFormat').querySelector('[value="m4a"]').disabled=!sidRecorder.supportsM4a;
    if(!sidRecorder.supportsM4a)$('recordFormat').value='wav';
    $('recordToggle').disabled=false;
    $('recordStatus').textContent=sidRecorder.supportsM4a?'WAV / M4A ready':'WAV ready';
    const inst=performanceInstrument.getState();
    sidController=new UnisonSidController((register,value)=>audio.write(register,value),{voiceCount:inst.voiceCount,unisonCount:inst.unisonCount,mode:inst.mode,detune:inst.detune,onPitchStart:(slot,note,envelope)=>audio.startPitchEnvelope(slot,note,envelope),onPitchStop:slot=>audio.stopPitchEnvelope(slot),onPitchRetune:(slot,note)=>audio.retunePitchEnvelope(slot,note)});
    activeSidModel=requestedModel;
    progress('SID '+activeSidModel+' ready.');
    sidEventLog.add('sid-ready',{contextId:attempt,model:activeSidModel});
    syncEnginePans();
    syncEngineChipGains();
    await syncEngineChipModels();
    updateModulation();
    // LFO runs on the audio clock in the worklet; no main-thread modulation timer.
    const base=audio.context.baseLatency,output=audio.context.outputLatency;
    audioTiming.baseMs=Number.isFinite(base)?base*1000:null;
    audioTiming.outputMs=Number.isFinite(output)?output*1000:null;
    updateAudioTimingReport();
    button.hidden=true;button.disabled=false;
    if(audio.context.state==='suspended'||audio.context.state==='running')refreshEngineStatus();
  }catch(err){
    // Retire callbacks before cleanup, including delayed resume/port events.
    ++sidAttempt;sidContextRetired=true;
    if(context)context.onstatechange=null;
    sidAudio=null;sidController=null;sidRecorder=null;activeSidModel=null;
    $('recordToggle').disabled=true;
    let message=err.message||String(err);
    try{if(audio)await audio.close();else if(context)await closeSidContext(context)}catch(cleanup){sidCleanupBlocked=true;message+='; '+cleanup.message}
    sidContext=context?.state==='closed'?null:context;
    status.textContent='SID unavailable: '+message;
    sidStartupLog.push('Failed: '+message);updateAudioTimingReport();
    button.disabled=sidCleanupBlocked||Boolean(sidContext);button.hidden=false;
    if(sidCleanupBlocked||sidContext)status.textContent+=' Reload the page before retrying.';
  }finally{sidStarting=false;$('sidSpinner').hidden=true;updateSidActivation();if(!sidAudio)$('sidUnlock').hidden=true}
  };
  pendingSidStartup=load();
  try{return await pendingSidStartup}
  finally{pendingSidStartup=null}
}
let pendingSidClose=null;
async function retireSidAudio(){
  if(pendingSidClose)return pendingSidClose;
  const audio=sidAudio,context=sidContext;
  ++sidAttempt;sidContextRetired=true;
  if(context)context.onstatechange=null;
  panic();
  sidAudio=null;sidController=null;sidRecorder=null;activeSidModel=null;
  pendingSidClose=(async()=>{
    try{if(audio)await audio.close();else if(context)await closeSidContext(context)}
    catch(error){sidCleanupBlocked=true;throw error}
    finally{if(context?.state==='closed')sidContext=null;updateSidActivation()}
  })();
  try{await pendingSidClose}finally{pendingSidClose=null}
}
async function failActiveSid(error,attempt){
  if(attempt!==sidAttempt)return;
  $('recordToggle').disabled=true;
  let message=error.message;
  try{await retireSidAudio()}catch(cleanup){message+='; '+cleanup.message}
  if(sidAttempt!==attempt+1)return;
  $('sidEngineStatus').textContent='SID unavailable: '+message+(sidCleanupBlocked||sidContext?' Reload the page before retrying.':'');
  $('sidStart').hidden=false;$('sidStart').disabled=sidCleanupBlocked||Boolean(sidContext);
  $('sidUnlock').hidden=true;
}
async function ensureSidModel(model){
  if(pendingSidClose)await pendingSidClose;
  // Serialize audio reinitialization with pending initial page startup.
  if(pendingSidStartup)await pendingSidStartup;
  if(Number($('chip').value)!==model)return; // Another preset was selected meanwhile.
  if(sidAudio&&activeSidModel===model)return;
  if(!sidAudio){
    await startSid();
  }else{
    silenceSidOutput();
    $('sidEngineStatus').textContent='Switching SID to '+model+'…';
    await sidAudio.setModel(model);
    activeSidModel=model;
    updateSidFilter();
    sidOutputMuted=false;
    sidEventLog.add('sid-model',{contextId:sidAttempt,model});
    refreshEngineStatus();
    updateSidLed();
  }
  if(!sidAudio||activeSidModel!==model)
    throw new Error('Unable to start the '+model+' SID engine.');
}
async function stopAndSaveRecording(){
 if(!sidRecorder?.recording||recordBusy)return;
 recordBusy=true;
 $('recordToggle').disabled=true;
 if(recordTimer!==null){clearTimeout(recordTimer);recordTimer=null}
 try{
  $('recordStatus').textContent='Finalizing recording…';
  const {blob,extension}=await sidRecorder.stop();
  if(recordDownloadUrl)URL.revokeObjectURL(recordDownloadUrl);
  const {url,filename}=prepareRecordingDownload(blob,extension,$('recordDownload'));
  recordDownloadUrl=url;
  $('recordStatus').textContent='Recording ready: '+filename;
 }catch(error){
  $('recordStatus').textContent='Recording failed: '+(error.message||error);
 }finally{
  recordBusy=false;
  $('recordToggle').disabled=false;
  $('recordToggle').dataset.recording='false';
  $('recordToggle').textContent='● Record';
  $('recordFormat').disabled=false;
 }
}
$('recordToggle').addEventListener('click',async()=>{
 if(recordBusy||!sidRecorder)return;
 if(sidRecorder.recording){await stopAndSaveRecording();return}
 recordBusy=true;$('recordToggle').disabled=true;
 try{
  const format=$('recordFormat').value;
  $('recordDownload').hidden=true;
  await sidRecorder.start(format);
  $('recordFormat').disabled=true;
  $('recordStatus').textContent='Recording '+format.toUpperCase()+' · max 3 min';
  $('recordToggle').dataset.recording='true';
  $('recordToggle').textContent='■ Stop & save';
  // Bound memory on iPad. This timer is for ending capture, not musical events.
  recordTimer=setTimeout(()=>{void stopAndSaveRecording()},3*60*1000);
 }catch(error){
  $('recordStatus').textContent='Recording unavailable: '+(error.message||error);
 }finally{
  recordBusy=false;$('recordToggle').disabled=false;
 }
});
$('sidStart').addEventListener('click',()=>{void startSid({gesture:true})});
$('sidUnlock').addEventListener('click',unlockSidAudio);
function armSidResume(){
  const context=sidContext,attempt=sidAttempt;
  if(sidContextRetired||!context||!needsAudioResume(context.state))return;
  // Call resume() for this gesture even if an older resume() is still pending.
  context.resume().then(()=>{
    if(context!==sidContext||attempt!==sidAttempt)return;
    if(sidAudio&&context.state==='running')refreshEngineStatus();
    updateSidActivation();
    flushQueuedKeys();
  }).catch(err=>{
    if(context!==sidContext||attempt!==sidAttempt)return;
    $('sidEngineStatus').textContent='Tap Enable audio again: '+err.message;
    updateSidActivation();
  });
}
function unlockSidAudio(){
  armSidResume();
}
document.addEventListener('pointerdown',unlockSidAudio,{capture:true});
document.addEventListener('keydown',unlockSidAudio,{capture:true});
let referenceToneCount=0;
let lastReferenceTone=null;
$('sidReferenceTone').addEventListener('click',()=>{
 const context=sidAudio?.context;
 const status=$('sidReferenceStatus');
 if(!context||context.state!=='running'){
  status.textContent='Enable audio and wait for SID to be ready, then try again.';
  return;
 }
 const start=context.currentTime;
 if(lastReferenceTone?.context===context&&start<lastReferenceTone.end)return;

 const oscillator=context.createOscillator();
 const gain=context.createGain();
 const end=start+0.15;
 oscillator.frequency.value=660;
 gain.gain.setValueAtTime(0,start);
 gain.gain.linearRampToValueAtTime(0.12,start+0.005);
 gain.gain.setValueAtTime(0.12,end-0.02);
 gain.gain.linearRampToValueAtTime(0,end);
 oscillator.connect(gain);
 gain.connect(context.destination);
 oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
 oscillator.start(start);
 oscillator.stop(end);

 lastReferenceTone={context,end};
 status.textContent='Reference tone triggered ('+(++referenceToneCount)+').';
 sidEventLog.add('reference-tone',{contextId:sidAttempt,contextState:context.state,scheduledAudioTimeSeconds:start});
});
// Stop capture before Safari suspends background page timers.
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&sidRecorder?.recording&&!recordBusy)void stopAndSaveRecording();
});
// Sound + performance presets. Held/latching notes are intentionally not serialized.
function snapshotPresetSettings(){
 // A browser-restored select can have no selected option. Playback defaults to Up.
 const arpPattern=$('arpPattern').value||'up';
 return validatePresetSettings({
  sound:{
   engines:engines.map(engine=>({model:engine.model,pan:engine.pan,
    voice:{...engine.voice},filter:{...engine.filter}})),
   instrument:performanceInstrument.getState(),
   lfos:lfoState.map(lfo=>({...lfo}))
  },
  performance:{
   masterBpm:Number($('masterBpm').value),
   routing:performanceRouting.getState(),
   arp:{enabled:performanceArp.rootOn,latch:performanceArp.latchOn,pattern:arpPattern,
    rate:Number($('arpRate').value),sync:$('arpSync').checked,localBpm:Number($('arpBpm').value)},
   game:{enabled:performanceArp.gameOn,style:$('gameArpStyle').value||'action',
    rate:Number($('gameRate').value),sequence:seqState},
   scale:readScaleStateFromDom($)
  }
 });
}
function resetPerformanceGenerators(){
 gameStop();
 if(arp.timer!==null){clearInterval(arp.timer);arp.timer=null}
 arpStopVoice();
 arp.held.clear();arp.latched.clear();arp.step=0;
 game.step=0;arp.root=null;seqPreview=false;setSeqTransportLabel();
 for(const key of keys.values())key.classList.remove('down');
}
function applyPresetControls(next,{silenceAudio=true}={}){
 // Full panic when routing/voices/models require silence; always reset arp/seq UI state.
 if(silenceAudio)panic();
 resetPerformanceGenerators();
 next.sound.engines.forEach((engine,index)=>{
  engines[index].model=engine.model;
  engines[index].pan=engine.pan;
  Object.assign(engines[index].voice,engine.voice);
  Object.assign(engines[index].filter,engine.filter);
 });
 Object.assign(settings[0],engines[0].voice);
 $('chip').value=String(engines[0].model);
 performanceRouting.applyFromPreset(next.performance);
 performanceInstrument.applyFromPreset(next.sound.instrument);
 syncVoiceCountOptions();
 syncUnisonCountOptions();
 next.sound.lfos.forEach((lfo,i)=>Object.assign(lfoState[i],lfo));
 $('masterBpm').value=String(next.performance.masterBpm);
 $('masterBpmValue').textContent=String(next.performance.masterBpm);
 performanceArp.applyFromPreset(next.performance);
 $('arpPattern').value=next.performance.arp.pattern;
 $('arpRate').value=String(next.performance.arp.rate);
 $('arpSync').checked=next.performance.arp.sync;
 $('arpBpm').value=String(next.performance.arp.localBpm);
 $('bpmValue').textContent=String(next.performance.arp.localBpm);
 setLayoutInert(document.querySelector('.arp-local-bpm'),next.performance.arp.sync);
 $('gameArpStyle').value=next.performance.game.style;
 $('gameRate').value=String(next.performance.game.rate);
 $('scaleKey').value=String(next.performance.scale.tonic);
 $('scaleId').value=next.performance.scale.id;
 $('scaleLock').checked=next.performance.scale.lock;
 seqState=validateSequence(next.performance.game.sequence);
 renderSequenceSteps();
 loadBuiltInPhrase($('gameArpStyle').value);
 renderKeyboard();
 enginePanelsUi?.render();renderLfos();updateUnison();updateModulation();
 void syncEngineChipModels();
 if(performanceArp.gameOn||performanceArp.rootOn)restartGenerators();
 $('arpStatus').textContent=silenceAudio?'Preset ready · press a key':'Preset ready · held notes may continue';
}
async function applyPresetSettings(value){
 if(sidRecorder?.recording||recordBusy)throw new Error('Finish recording before loading a preset');
 const next=validatePresetSettings(value);
 const previous=snapshotPresetSettings();
 const silenceAudio=presetLoadRequiresSilence(previous,next);
 const presetModel=next.sound.engines[0].model;
 sidEventLog.add('preset-apply',{contextId:sidAudio?sidAttempt:null,activeModel:activeSidModel,requestedModel:presetModel,silenceAudio});
 traceStudio('preset-apply',{name:$('presetCurrent')?.textContent??'preset',model:presetModel,
  voices:next.sound.instrument.voiceCount,unison:next.sound.instrument.unisonCount,mode:next.sound.instrument.mode,
  keyboardRoute:performanceRouting.keyboard,silenceAudio});
 applyPresetControls(next,{silenceAudio});
 syncLegacyFilterInputs();syncEnginePans();syncEngineChipGains();
 try{
  await ensureSidModel(presetModel);
  for(let chip=0;chip<engines.length;chip++){
   if(sidAudio?.setChipModel)await sidAudio.setChipModel(chip,engines[chip].model);
  }
  if(activeSidModel!==presetModel)throw new Error('SID chip model does not match the selected preset');
 }catch(error){
  // Loading is transactional even if a device fails to initialize.
  applyPresetControls(previous,{silenceAudio:true});
  try{await ensureSidModel(previous.sound.engines[0].model)}
  catch(recoveryError){
    throw new Error('Could not load preset: '+error.message+
      '. Previous controls restored, but audio recovery failed: '+recoveryError.message);
  }
  throw new Error('Could not load preset: '+error.message+'. Previous sound restored.');
 }
 return {silenced:silenceAudio};
}
let presetLoading=false;
let presetLibrary;
function setPresetLoading(busy){
 presetLoading=busy;
 const selectedKind=presetLibrary.selectedKind();
 const userCount=presetLibrary.userCount();
 $('chip').disabled=busy;
 $('presetDialog').setAttribute('aria-busy',String(busy));
 const editable=selectedKind==='user';
 for(const [id,available] of [
  ['presetSave',editable],['presetSaveAs',true],['presetRename',editable],
  ['presetDelete',editable],['presetExport',true],['presetExportBank',userCount>0],
  ['presetImport',true]
 ])$(id).disabled=busy||!available;
 for(const id of ['factoryPresetList','userPresetList'])
  $(id).querySelectorAll('button').forEach(button=>button.disabled=busy);
}
function refreshPresetDirty(){presetLibrary.refreshDirty()}
presetLibrary=mountPresetLibrary({
 $,
 snapshotSettings:snapshotPresetSettings,
 applySettings:applyPresetSettings,
 setLoading:setPresetLoading,
 isLoading:()=>presetLoading
});
const startupPreset=FACTORY_PRESETS.find(preset=>preset.id===STARTUP_FACTORY_PRESET_ID);
if(startupPreset){
 applyPresetControls(startupPreset.settings,{silenceAudio:false});
 presetLibrary.selectFactoryPreset(STARTUP_FACTORY_PRESET_ID);
}
$('chip').addEventListener('change',async event=>{
 const chip=event.currentTarget;
 const model=Number(chip.value);
 const previousModel=activeSidModel;
 if(presetLoading||model===previousModel)return;
 if(sidRecorder?.recording||recordBusy){
  chip.value=String(previousModel);
  $('sidEngineStatus').textContent='Finish recording before switching SID models.';
  return;
 }
 setPresetLoading(true);
 panic();arp.held.clear();arp.latched.clear();
 seqPreview=false;setSeqTransportLabel();
 for(const key of keys.values())key.classList.remove('down');
 try{
  await ensureSidModel(model);
 }catch(error){
  let message='Could not switch to SID '+model+': '+error.message;
  if(previousModel!==null){
   chip.value=String(previousModel);
   try{await ensureSidModel(previousModel)}
   catch(recoveryError){message+=' Previous model recovery failed: '+recoveryError.message}
  }
  $('sidEngineStatus').textContent=message;
 }finally{
  setPresetLoading(false);
  refreshPresetDirty();
 }
});
startSid();
}
