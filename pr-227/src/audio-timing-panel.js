import {formatSidDiagnosticReport} from './sid-event-log.js?v=0.31.0+20261128T022520326Z';
import {formatPlaybackLatencyStatus} from './sid-engine-status-ui.js?v=0.31.0+20261128T022520326Z';
import {formatChipRenderDiagnosticLines} from './sid-chip-render-diagnostic.js?v=0.31.0+20261128T022520326Z';
import {formatSequencerMirror} from './sequencer-mirror.js?v=0.31.0+20261128T022520326Z';
import {formatDrumShadow} from './sequencer-shadow.js?v=0.31.0+20261128T022520326Z';

/** One diagnostics line for the worklet sequencer probe (step 3). */
/** Step G3: who plays the Game Arp, and how the worklet's run went. */
export function formatWorkletGameArp(report){
 if(!report?.enabled)return 'Game Arp timing: page timer';
 if(!report.active&&!report.steps)return 'Game Arp timing: page timer (worklet Game Arp timing is on but unavailable)';
 let line='Game Arp timing: worklet'+(report.playing?' (playing)':'')+' · '+(report.steps??0)+' steps, '+(report.notes??0)+' notes';
 if(Number.isFinite(report.leadMs))line+=' · start lead '+(report.leadMs>=0?'+':'')+report.leadMs.toFixed(1)+' ms';
 const skipped=Object.entries(report.skipped??{});
 if(skipped.length)line+=' · skipped '+skipped.map(([reason,count])=>reason+' '+count).join(', ');
 if(report.syncs)line+=' · re-synced to the page clock '+report.syncs+'× (largest '+report.shiftMaxMs.toFixed(1)+' ms'
  +(report.syncSkipped?', '+report.syncSkipped+' steps skipped':'')+')';
 if(report.dropped)line+=' · '+report.dropped+' report entries dropped';
 if(report.error)line+=' · error: '+report.error;
 return line;
}
/** Step G2: who turns note calls into register writes. */
export function formatNoteController(report){
 if(report?.active){
  const counts=(report.ops??0)+' ops, '+(report.writes??0)+' writes';
  const problems=(report.errors?', '+report.errors+' errors'+(report.lastError?' (last: '+report.lastError+')':''):'')
   +(report.missing?', '+report.missing+' ops dropped (no worklet controller)':'');
  return 'Note writes: worklet note controller ('+counts+problems+')';
 }
 return 'Note writes: page'+(report?.requested?' (worklet note controller requested; waiting for or missing sequencer modules v8)':'');
}
export function formatSequencerSupport(support){
 if(!support)return 'Worklet sequencer modules: not reported yet';
 if(support.loadError)return 'Worklet sequencer modules: failed to load ('+support.loadError+')';
 if(!support.available)return 'Worklet sequencer modules: not available in the audio worklet';
 if(support.selfTest?.ok)return 'Worklet sequencer modules: ready (self-test passed)';
 return 'Worklet sequencer modules: self-test failed ('+(support.selfTest?.error??'no result')+')';
}

export function mountAudioTimingPanel({
 $,sidEventLog,audioTiming,sidStartupLog,getSidAudio,getSidContext,getReportContext
}={}){
 if(!$||!sidEventLog||!audioTiming)throw new TypeError('mountAudioTimingPanel requires $, sidEventLog, and audioTiming');
 function updateAudioTimingReport(){
  const show=value=>Number.isFinite(value)?value.toFixed(1)+' ms':'not reported';
  const keyLine=audioTiming.keyEnergyMissed
   ?'Key → loud PCM in worklet: no loud sample within 16 render blocks.'
   :'Key → loud PCM in worklet: '+show(audioTiming.keyEnergyMs)+'.';
  const outputLine=audioTiming.keyEnergyMissed||!Number.isFinite(audioTiming.keyToOutputEstimateMs)
   ?null
   :'Estimated key → device output: '+show(audioTiming.keyToOutputEstimateMs)
    +' (includes '+show(audioTiming.keyBufferRemainderMs)+' in current block + '+show(audioTiming.outputMs)+' output buffer).';
  const lines=[
   keyLine,
   ...(outputLine?[outputLine]:[]),
   'Main thread ↔ worklet control ping (not note audio): '+show(audioTiming.roundTripMs)
    +(audioTiming.source?' ('+audioTiming.source+')':'')
  ];
  if(audioTiming.probeSkipped)lines.push('This note kept the previous acknowledgment. The probe runs at most twice a second.');
  lines.push(
   'WASM render per block: '+show(audioTiming.renderAvgMs)+' average / '+show(audioTiming.renderMaxMs)+' max',
   'Audio render block budget: '+show(audioTiming.renderBudgetMs),
   ...formatChipRenderDiagnosticLines({
    renderAvgMs:audioTiming.renderAvgMs,
    renderMaxMs:audioTiming.renderMaxMs,
    renderBudgetMs:audioTiming.renderBudgetMs,
   }),
   'Browser base/output latency: '+show(audioTiming.baseMs)+' / '+show(audioTiming.outputMs),
   formatSequencerSupport(audioTiming.sequencerModules),
   formatSequencerMirror(audioTiming.sequencerMirror),
   formatDrumShadow(audioTiming.drumShadow),
   'Drum timing: '+(audioTiming.workletDrumTiming?.active?'worklet plays the drums':
    audioTiming.workletDrumTiming?.enabled?'page timer (worklet drum timing is on but unavailable)':'page timer'),
   formatNoteController(audioTiming.noteController),
   formatWorkletGameArp(audioTiming.workletGameArp),
   'Device output line is an estimate from loud PCM + AudioContext.outputLatency; not a DAC measurement. Screen recording A/V sync can differ.',
   ...sidStartupLog
  );
  $('audioTimingSummary').textContent=lines.join('\n');
  $('sidLatencyStatus').textContent=formatPlaybackLatencyStatus(audioTiming);
 }
 updateAudioTimingReport();
 const sidAudio=()=>getSidAudio?.()??null;
 const sidContext=()=>getSidContext?.()??null;
 $('audioTimingDetails').addEventListener('toggle',()=>{
  sidAudio()?.setTimingEnabled?.($('audioTimingDetails').open);
  if($('audioTimingDetails').open)updateAudioTimingReport();
 });
 $('sidEventLogging').addEventListener('change',()=>{
  sidEventLog.setEnabled($('sidEventLogging').checked);
  sidAudio()?.setEventLogging(sidEventLog.enabled);
  sidEventLog.add('logging-enabled',{contextState:sidContext()?.state??'unavailable'});
  $('sidCopyStatus').textContent=sidEventLog.enabled?'Logging recent note events locally.':'Logging paused; captured events remain available.';
 });
 $('sidClearLog').addEventListener('click',()=>{
  sidEventLog.clear();sidAudio()?.setEventLogging(sidEventLog.enabled);
  $('sidReportFallback').hidden=true;$('sidReportFallback').value='';
  $('sidCopyStatus').textContent='Event log cleared.';
 });
 $('sidCopyReport').addEventListener('click',async()=>{
  const report=formatSidDiagnosticReport(sidEventLog,getReportContext());
  try{
   await navigator.clipboard.writeText(report);
   $('sidReportFallback').hidden=true;$('sidReportFallback').value='';
   $('sidCopyStatus').textContent='Diagnostic report copied.';
  }catch{
   const field=$('sidReportFallback');field.value=report;field.hidden=false;field.focus();field.select();
   $('sidCopyStatus').textContent='Clipboard unavailable. Select and copy the report below.';
  }
 });
 return {updateAudioTimingReport};
}