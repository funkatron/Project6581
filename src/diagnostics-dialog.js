import {formatSidDiagnosticReport} from './sid-event-log.js?v=__BUILD_ID__';
import {formatStudioTraceText,formatStudioTraceReport} from './studio-trace-log.js?v=__BUILD_ID__';

export function mountDiagnosticsDialog({
 $,studioTrace,sidEventLog,getReportContext,updateAudioTimingReport
}={}){
 if(!$||!studioTrace||!sidEventLog)throw new TypeError('mountDiagnosticsDialog requires $, studioTrace, and sidEventLog');
 const dialog=$('studioDiagnostics');
 if(!dialog)return {refresh:()=>{},addTrace:()=>{}};
 const traceView=$('diagnosticsTraceView');
 const timingView=$('diagnosticsTimingView');
 const status=$('diagnosticsStatus');
 function refresh(){
  const traceText=formatStudioTraceText(studioTrace.snapshot(),{
   headerLines:['Studio trace (newest last):']
  });
  traceView.textContent=traceText;
  updateAudioTimingReport?.();
  if(timingView&&$('audioTimingSummary'))timingView.textContent=$('audioTimingSummary').textContent;
 }
 dialog.addEventListener('close',()=>{if(status)status.textContent=''});
 $('diagnosticsOpen')?.addEventListener('click',()=>{
  if($('diagnosticsNoteLogging')&&$('sidEventLogging'))
   $('diagnosticsNoteLogging').checked=$('sidEventLogging').checked;
  refresh();
  if(!dialog.open)dialog.showModal();
 });
 $('diagnosticsClose')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 const syncNoteLogging=()=>{
  const on=$('diagnosticsNoteLogging')?.checked;
  if($('sidEventLogging'))$('sidEventLogging').checked=on;
  $('sidEventLogging')?.dispatchEvent(new Event('change',{bubbles:true}));
 };
 $('diagnosticsNoteLogging')?.addEventListener('change',syncNoteLogging);
 $('diagnosticsClearTrace')?.addEventListener('click',()=>{
  studioTrace.clear();
  refresh();
  if(status)status.textContent='Studio trace cleared.';
 });
 $('diagnosticsClearAll')?.addEventListener('click',()=>{
  studioTrace.clear();
  $('sidClearLog')?.click();
  refresh();
  if(status)status.textContent='Studio trace and note log cleared.';
 });
 $('diagnosticsCopy')?.addEventListener('click',async()=>{
  refresh();
  const environment=getReportContext?.()??{};
  const bundle={studioTrace:JSON.parse(formatStudioTraceReport(studioTrace.snapshot(),environment)),
   noteEvents:sidEventLog.enabled?JSON.parse(formatSidDiagnosticReport(sidEventLog,environment)):null};
  const report=JSON.stringify(bundle,null,2);
  try{
   await navigator.clipboard.writeText(report);
   if(status)status.textContent='Diagnostic bundle copied.';
  }catch{
   const field=$('diagnosticsCopyFallback');
   if(field){field.value=report;field.hidden=false;field.focus();field.select()}
   if(status)status.textContent='Select and copy the report field below.';
  }
 });
 return {
  refresh,
  addTrace:(type,details)=>studioTrace.add(type,details)
 };
}