import {formatSidDiagnosticReport} from './sid-event-log.js?v=__BUILD_ID__';
import {formatStudioTraceText,formatStudioTraceReport} from './studio-trace-log.js?v=__BUILD_ID__';

const EDITOR_TABS=['voice','play','lfos'];

function setWorkspaceTab($,name,options={}){
 const workspace=$('workspace');
 if(!workspace)return;
 workspace.dataset.tab=name;
 const tabButtons={voice:'tabVoice',play:'tabPlay',lfos:'tabLfos'};
 for(const [tabName,id] of Object.entries(tabButtons))
  $(id)?.setAttribute('aria-selected',String(name===tabName));
 for(const panel of workspace.querySelectorAll(':scope > [role="tabpanel"]')){
  if(name==='diag'){
   panel.hidden=panel.id!=='diagPanel';
   continue;
  }
  if(panel.id==='diagPanel'){panel.hidden=true;continue}
  panel.hidden=panel.getAttribute('aria-labelledby')!==tabButtons[name];
 }
 options.onChange?.(name);
}

function buildBundle(studioTrace,sidEventLog,getReportContext){
 const environment=getReportContext?.()??{};
 return JSON.stringify({
  studioTrace:JSON.parse(formatStudioTraceReport(studioTrace.snapshot(),environment)),
  noteEvents:sidEventLog.enabled?JSON.parse(formatSidDiagnosticReport(sidEventLog,environment)):null
 },null,2);
}

function downloadText(filename,text){
 const blob=new Blob([text],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;
 link.download=filename;
 link.rel='noopener';
 document.body.append(link);
 link.click();
 link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function mountDiagnosticsPanel({
 $,studioTrace,sidEventLog,getReportContext,updateAudioTimingReport
}={}){
 if(!$||!studioTrace||!sidEventLog)throw new TypeError('mountDiagnosticsPanel requires $, studioTrace, and sidEventLog');
 const panel=$('diagPanel');
 if(!panel)return {refresh:()=>{},isVisible:()=>false};
 const traceView=$('diagnosticsTraceView');
 const timingView=$('diagnosticsTimingView');
 const status=$('diagnosticsStatus');
 let returnTab='voice';
 function isVisible(){return $('workspace')?.dataset.tab==='diag'}
 function refresh(){
  const traceText=formatStudioTraceText(studioTrace.snapshot(),{
   headerLines:['Studio trace (newest first):'],
   newestFirst:true
  });
  if(traceView)traceView.textContent=traceText;
  updateAudioTimingReport?.();
  if(timingView&&$('audioTimingSummary'))timingView.textContent=$('audioTimingSummary').textContent;
 }
 function openPanel(){
  const workspace=$('workspace');
  const current=workspace?.dataset.tab;
  if(current&&EDITOR_TABS.includes(current))returnTab=current;
  if($('diagnosticsNoteLogging')&&$('sidEventLogging'))
   $('diagnosticsNoteLogging').checked=$('sidEventLogging').checked;
  refresh();
  setWorkspaceTab($,'diag');
  panel.scrollTop=0;
 }
 function closePanel(){
  const tab=EDITOR_TABS.includes(returnTab)?returnTab:'voice';
  setWorkspaceTab($,tab);
  if(status)status.textContent='';
 }
 $('diagnosticsOpen')?.addEventListener('click',openPanel);
 $('diagnosticsBack')?.addEventListener('click',closePanel);
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
  const report=buildBundle(studioTrace,sidEventLog,getReportContext);
  try{
   await navigator.clipboard.writeText(report);
   if(status)status.textContent='Diagnostic bundle copied.';
  }catch{
   const field=$('diagnosticsCopyFallback');
   if(field){field.value=report;field.hidden=false;field.focus();field.select()}
   if(status)status.textContent='Select and copy the report field below.';
  }
 });
 $('diagnosticsDownload')?.addEventListener('click',()=>{
  refresh();
  const stamp=new Date().toISOString().replace(/\.\d{3}Z$/,'Z').replace(/:/g,'-');
  downloadText(`project6581-diagnostics-${stamp}.json`,buildBundle(studioTrace,sidEventLog,getReportContext));
  if(status)status.textContent='Diagnostic bundle downloaded.';
 });
 // Main editor tabs exit diagnostics without leaving a stale data-tab value.
 for(const id of ['tabVoice','tabPlay','tabLfos'])
  $(id)?.addEventListener('click',()=>{if(isVisible())if(status)status.textContent=''});
 return {refresh,isVisible:()=>isVisible()};
}