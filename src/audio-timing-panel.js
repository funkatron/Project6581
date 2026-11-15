import {formatSidDiagnosticReport} from './sid-event-log.js?v=__BUILD_ID__';

export function mountAudioTimingPanel({
 $,sidEventLog,audioTiming,sidStartupLog,getSidAudio,getSidContext,getReportContext
}={}){
 if(!$||!sidEventLog||!audioTiming)throw new TypeError('mountAudioTimingPanel requires $, sidEventLog, and audioTiming');
 function updateAudioTimingReport(){
  const show=value=>Number.isFinite(value)?value.toFixed(1)+' ms':'not reported';
  const keyLine=audioTiming.keyEnergyMissed?'Key to first loud sample: no loud sample.':'Key to first loud sample: '+show(audioTiming.keyEnergyMs)+'.';
  const lines=[
   keyLine,
   'Note dispatch → AudioWorklet acknowledgment: '+show(audioTiming.roundTripMs)+(audioTiming.source?' ('+audioTiming.source+')':'')
  ];
  if(audioTiming.probeSkipped)lines.push('This note kept the previous acknowledgment. The probe runs at most twice a second.');
  lines.push(
   'WASM render per block: '+show(audioTiming.renderAvgMs)+' average / '+show(audioTiming.renderMaxMs)+' max',
   'Audio render block budget: '+show(audioTiming.renderBudgetMs),
   'Browser base/output latency: '+show(audioTiming.baseMs)+' / '+show(audioTiming.outputMs),
   'Processing measurements only, not speaker latency. Screen recording A/V sync can differ.',
   ...sidStartupLog
  );
  $('audioTimingSummary').textContent=lines.join('\n');
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