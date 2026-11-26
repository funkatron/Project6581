import {drumStep} from './sequencer-steps.js?v=__BUILD_ID__';
import {drumSequence} from './transport-state.js?v=__BUILD_ID__';
import {drumBpm} from './drum-lane-trigger.js?v=__BUILD_ID__';
import {stepMilliseconds} from './arp-composition.js?v=__BUILD_ID__';

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

export const SHADOW_MESSAGE='sequencer-shadow';
export const SHADOW_STATUS='sequencer-shadow-status';
const STEP_COUNT=16;
const MAX_REPORTED_STEPS=64;
const MAX_STEPS_PER_BLOCK=8;
const MATCH_WINDOW=512;

/** Seconds per drum step; the same tempo and rate the page's drum timer uses. */
export function drumStepSeconds(transport){
 const sequence=drumSequence(transport);
 return stepMilliseconds(drumBpm(sequence,transport.masterBpm),sequence.rate)/1000;
}

const lanesOnStep=(transport,index)=>drumStep({step:index},{sequence:drumSequence(transport)}).hits.map(hit=>hit.lane).join(',');

/** Worklet side. All times in frames. */
export function createDrumShadow(sampleRate){
 let run=null,steps=[],dropped=0,lead=null,error=null;
 return {
  get running(){return run!==null},
  control(message,transport,currentFrame){
   if(message.action==='stop'){run=null;return}
   if(message.action!=='run')throw new RangeError('shadow action '+message.action);
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
  hasReport:()=>steps.length>0||lead!==null||error!==null,
  takeReport(){
   const report={sampleRate,steps,dropped,lead,error};
   steps=[];dropped=0;lead=null;error=null;
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
  workletHits:0,workletAuditions:0,workletSkipped:{}};
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
 return line;
}
