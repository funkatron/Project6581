import {drumStep} from './sequencer-steps.js?v=0.31.0+20261128T022520326Z';
import {drumSequence} from './transport-state.js?v=0.31.0+20261128T022520326Z';
import {drumBpm} from './drum-lane-trigger.js?v=0.31.0+20261128T022520326Z';
import {stepMilliseconds} from './arp-composition.js?v=0.31.0+20261128T022520326Z';

// Step 3b (worklet sequencing): a drum "shadow clock" in the worklet.
//
// The page still plays the drums. When its drum sequencer starts, restarts
// (tempo/rate change) or stops, it tells the worklet, which then counts the
// same steps on currentFrame from the mirrored transport and reports which
// lanes it would hit and at which frame. The page matches those reports with
// its own ticks (stamped with context.currentTime, the same audio clock), so
// Audio timing shows whether the hits agree and how late the page's
// setInterval fires compared with a sample-accurate schedule. Nothing here
// plays a note.
//
// Control: {type:'sequencer-shadow', source:'drum', action:'run'|'stop', run, step, firstAt}
//   run      a page-side counter; ticks are matched by (run, n)
//   step     drum step index (0–15) of the first tick in this run
//   firstAt  audio time (s) of that first tick
// Report:  {type:'sequencer-shadow-status', sampleRate, steps:[[run,n,frame,index,lanes]], dropped, lead}
//   lead     frames between the worklet receiving 'run' and firstAt (negative: arrived late)
//
// Follow the page clock (fix after 0.27.2, iPad): the audio clock can lose time
// against the page clock when the audio thread stalls (unrendered frames are
// gone; iPad export 2026-11-26: −190 ms in ~4 s). Steps counted in frames then
// stay late against the page's step highlight, arps and keyboard. While the
// worklet plays the drums, the page sends where each next step should land:
//   {type:'sequencer-shadow', source:'drum', action:'sync', run, n, at}
//   n   the step's position in the run; at  its audio time (s), from the page clock
// When the worklet's grid differs by SYNC_THRESHOLD_MS or more on SYNC_CONFIRM
// syncs in a row (same sign), it moves its anchor by the smallest of those
// differences (currentTime readings are coarse, so single readings are noisy),
// then skips steps more than one step in the past, as the page grid timer does.

export const SHADOW_MESSAGE='sequencer-shadow';
export const SHADOW_STATUS='sequencer-shadow-status';
const STEP_COUNT=16;
const MAX_REPORTED_STEPS=64;
const MAX_STEPS_PER_BLOCK=8;
const MATCH_WINDOW=512;
export const SYNC_THRESHOLD_MS=8;
export const SYNC_CONFIRM=4;

/** Seconds per drum step; the same tempo and rate the page's drum timer uses. */
export function drumStepSeconds(transport){
 const sequence=drumSequence(transport);
 return stepMilliseconds(drumBpm(sequence,transport.masterBpm),sequence.rate)/1000;
}

const lanesOnStep=(transport,index)=>drumStep({step:index},{sequence:drumSequence(transport)}).hits.map(hit=>hit.lane).join(',');

/** Worklet side. All times in frames. */
export function createDrumShadow(sampleRate){
 let run=null,steps=[],dropped=0,lead=null,error=null;
 let syncs=0,syncShiftMax=0,syncSkipped=0,pending=[];
 const threshold=SYNC_THRESHOLD_MS*sampleRate/1000;
 function sync(message,currentFrame){
  if(!run||message.run!==run.id||!Number.isInteger(message.n)||!Number.isFinite(message.at))return;
  const want=Math.round(message.at*sampleRate-message.n*run.stepFrames);
  const shift=want-run.anchor;
  if(Math.abs(shift)<threshold){pending=[];return}
  if(pending.length&&Math.sign(pending[0])!==Math.sign(shift))pending=[];
  pending.push(shift);
  if(pending.length<SYNC_CONFIRM)return;
  const move=pending.reduce((a,b)=>Math.abs(b)<Math.abs(a)?b:a);
  pending=[];
  run.anchor+=move;
  syncs++;syncShiftMax=Math.max(syncShiftMax,Math.abs(move));
  // Skip steps more than one step in the past; one late by less still plays.
  while(run.anchor+Math.round(run.n*run.stepFrames)<currentFrame-run.stepFrames){run.n++;syncSkipped++}
 }
 return {
  get running(){return run!==null},
  control(message,transport,currentFrame){
   if(message.action==='stop'){run=null;pending=[];return}
   if(message.action==='sync'){sync(message,currentFrame);return}
   if(message.action!=='run')throw new RangeError('shadow action '+message.action);
   pending=[];
   if(!transport){error='no transport mirrored';run=null;return}
   const stepFrames=drumStepSeconds(transport)*sampleRate;
   const anchor=Math.round(message.firstAt*sampleRate);
   run={id:message.run,start:message.step%STEP_COUNT,n:0,anchor,stepFrames};
   lead=anchor-currentFrame;error=null;
  },
  /** Counts every step whose frame falls before untilFrame; returns those steps as [{n, frame, index}]. */
  advance(untilFrame,transport){
   const counted=[];
   if(!run||!transport)return counted;
   for(let i=0;i<MAX_STEPS_PER_BLOCK;i++){
    const frame=run.anchor+Math.round(run.n*run.stepFrames);
    if(frame>=untilFrame)break;
    const index=(run.start+run.n)%STEP_COUNT;
    steps.push([run.id,run.n,frame,index,lanesOnStep(transport,index)]);
    if(steps.length>MAX_REPORTED_STEPS){steps.shift();dropped++}
    counted.push({n:run.n,frame,index});
    run.n++;
   }
   return counted;
  },
  hasReport:()=>steps.length>0||lead!==null||error!==null||syncs>0,
  takeReport(){
   const report={sampleRate,steps,dropped,lead,error,syncs,syncShiftMax,syncSkipped};
   steps=[];dropped=0;lead=null;error=null;syncs=0;syncShiftMax=0;syncSkipped=0;
   return report;
  }
 };
}

/**
 * Page side. now() is the audio clock in seconds (context.currentTime);
 * post sends control messages to the worklet.
 */
export function createShadowComparator({now,post}){
 let runId=0,run=null,n=0;
 const pageTicks=new Map(),workletSteps=new Map();
 const stats={compared:0,hitsMatch:0,lateSum:0,lateMax:-Infinity,lateMin:Infinity,lastLeadMs:null,dropped:0,error:null,pageSkipped:0,
  workletHits:0,workletAuditions:0,workletSkipped:{},workletResyncs:0,workletResyncMaxMs:0,workletResyncSkipped:0};
 const key=(id,count)=>id+':'+count;
 const trim=map=>{while(map.size>MATCH_WINDOW)map.delete(map.keys().next().value)};
 function compare(page,worklet,sampleRate){
  const lateMs=(page.time-worklet.frame/sampleRate)*1000;
  stats.compared++;
  if(page.index===worklet.index&&page.lanes===worklet.lanes)stats.hitsMatch++;
  stats.lateSum+=lateMs;
  stats.lateMax=Math.max(stats.lateMax,lateMs);
  stats.lateMin=Math.min(stats.lateMin,lateMs);
 }
 return {
  /**
   * The page's drum timer (re)starts; its first tick is delayMs from now.
   * play: the worklet plays the steps too ("Worklet drum timing").
   */
  run({step,delayMs=0,play=false}){
   run=++runId;n=0;
   post({type:SHADOW_MESSAGE,source:'drum',action:'run',run,step,firstAt:now()+delayMs/1000,play});
  },
  /** While the worklet plays: step `n` of this run is due delayMs from now on the page clock. */
  sync({n:count,delayMs}){
   if(run===null)return;
   post({type:SHADOW_MESSAGE,source:'drum',action:'sync',run,n:count,at:now()+delayMs/1000});
  },
  stop(){
   if(run===null)return;
   run=null;
   post({type:SHADOW_MESSAGE,source:'drum',action:'stop'});
  },
  /**
   * Called as the page's drum tick fires, before it triggers sounds. count is the
   * tick's position in the run (steps the page skipped to stay in time included).
   */
  tick({index,hits,n:count,skipped=0}){
   if(run===null)return;
   if(Number.isInteger(count))n=count;
   stats.pageSkipped+=skipped;
   const entry={time:now(),index,lanes:hits.map(hit=>hit.lane).join(',')};
   const id=key(run,n++),worklet=workletSteps.get(id);
   if(worklet){workletSteps.delete(id);compare(entry,worklet,worklet.sampleRate)}
   else{pageTicks.set(id,entry);trim(pageTicks)}
  },
  receive(report){
   if(report.lead!==null&&report.lead!==undefined)stats.lastLeadMs=report.lead/report.sampleRate*1000;
   if(report.error)stats.error=report.error;
   stats.dropped+=report.dropped??0;
   if(report.syncs){
    stats.workletResyncs+=report.syncs;
    stats.workletResyncMaxMs=Math.max(stats.workletResyncMaxMs,report.syncShiftMax/report.sampleRate*1000);
    stats.workletResyncSkipped+=report.syncSkipped??0;
   }
   if(report.drums){
    stats.workletHits+=report.drums.hits??0;
    stats.workletAuditions+=report.drums.auditions??0;
    for(const [reason,count] of Object.entries(report.drums.skipped??{}))
     stats.workletSkipped[reason]=(stats.workletSkipped[reason]??0)+count;
   }
   for(const [id,count,frame,index,lanes] of report.steps??[]){
    const k=key(id,count),page=pageTicks.get(k),worklet={frame,index,lanes,sampleRate:report.sampleRate};
    if(page){pageTicks.delete(k);compare(page,worklet,report.sampleRate)}
    else{workletSteps.set(k,worklet);trim(workletSteps)}
   }
  },
  get running(){return run!==null},
  summary(){
   return {...stats,running:run!==null,lateAvg:stats.compared?stats.lateSum/stats.compared:null};
  }
 };
}

const ms=value=>(value>=0?'+':'')+value.toFixed(1)+' ms';

/** One diagnostics line for the Audio timing panel. */
export function formatDrumShadow(summary){
 const label='Drum shadow clock: ';
 if(!summary)return label+'idle (start the drum preview to compare)';
 if(summary.error)return label+'error ('+summary.error+')';
 if(!summary.compared)return label+(summary.running?'waiting for steps':'idle (start the drum preview to compare)');
 let line=label+summary.compared+' steps · hits match '+summary.hitsMatch+'/'+summary.compared
  +' · page timer vs audio clock avg '+ms(summary.lateAvg)+', range '+ms(summary.lateMin)+' to '+ms(summary.lateMax);
 if(summary.lastLeadMs!==null)line+=' · start message lead '+ms(summary.lastLeadMs);
 if(summary.pageSkipped)line+=' · page skipped '+summary.pageSkipped+' steps to stay in time';
 if(summary.dropped)line+=' · '+summary.dropped+' reports dropped';
 if(summary.workletHits)line+=' · worklet played '+summary.workletHits+' hits';
 const skipped=Object.entries(summary.workletSkipped??{});
 if(skipped.length)line+=' · worklet skipped '+skipped.map(([reason,count])=>reason+' '+count).join(', ');
 if(summary.workletResyncs)line+=' · worklet re-synced to the page clock '+summary.workletResyncs+'× (largest '
  +summary.workletResyncMaxMs.toFixed(1)+' ms'+(summary.workletResyncSkipped?', '+summary.workletResyncSkipped+' steps skipped':'')+')';
 return line;
}

/**
 * Studio trace lines for drum notes the worklet played (Worklet drum timing).
 * Events are [kind 'on'|'off', lane, note, frame, step]; atMs puts each one on
 * the page clock: now minus how long ago its frame was on the audio clock.
 */
export function workletDrumTraceEntries(events,{sampleRate,audioNowSec,pageNowMs}){
 if(!Array.isArray(events)||!(sampleRate>0))return [];
 return events.map(([kind,lane,note,frame,step])=>{
  const atMs=pageNowMs-(audioNowSec-frame/sampleRate)*1000;
  const details={atMs,note,source:'drum:'+lane,player:'worklet',frame};
  if(kind==='on'&&step>=0)details.step=step;
  return {type:kind==='on'?'note-on':'note-off',details};
 });
}
