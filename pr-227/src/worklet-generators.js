import {createWorkletGameArp} from './worklet-game-arp.js?v=0.31.0+20261128T022520326Z';
import {arpNotes,activeNotes,resolveNote,arpStepMs,gameStepMs} from './transport-state.js?v=0.31.0+20261128T022520326Z';
import {routeMask,dispatchUsesLayer} from './sid-engines.js?v=0.31.0+20261128T022520326Z';
import {SYNC_THRESHOLD_MS,SYNC_CONFIRM} from './sequencer-shadow.js?v=0.31.0+20261128T022520326Z';

// Step G3 (Game Arp in the worklet): "Worklet Game Arp timing".
//
// With the Game Arp on, the worklet runs the Game Arp clock and the Root Arp's
// root-picking clock on one frame clock (createWorkletGameArp, G1) and plays
// the Game Arp's notes through its note controller (G2), the way the page's
// play(note, 'game') / stop(note, 'game') do: scale resolve, Game Arp routing
// (one note across the chip mask, or one layer per chip), voice-enabled check,
// one owner per source. The Root Arp stays silent while the Game Arp is on.
//
// The page still decides when the generators run: restartGenerators() sends
//   {type:'sequencer-generators', action:'run', run, firstAt, rootOn, gameOn,
//    seqPreview, previewRootMidi, route, voiceEnabled:[3 booleans]}
// with firstAt 50 ms ahead (as Worklet drum timing). 'config' updates the same
// fields (no restart), 'stop' ends the run with the page's gameStop() note-off,
// 'release-root' {note} is the page's keyUp() re-pick of the Root Arp root.
// Rates, phrase, pattern, held/latched notes and the scale come from the
// mirrored transport.
//
// Like the drums, the worklet follows the page clock: the page's grid timers
// keep running (silent) and send {action:'sync', run, clock:'root'|'game', n, at};
// the same rule as the drum shadow re-anchors a clock after SYNC_CONFIRM syncs
// in a row SYNC_THRESHOLD_MS or more off, and skips steps more than one step
// behind (the step counters move past them, as the page's do).
//
// On one frame, the Root step goes before the Game step; a gate-off due before
// a Game step goes before it. Everything due inside a block is applied at the
// block's start.
//
// The worklet reports each step (index, highlight, status) so the page can
// draw the step highlight, key highlight and status line, and each note-on/off
// for the studio trace.

export const GENERATORS_MESSAGE='sequencer-generators';
export const GENERATORS_STATUS='sequencer-generators-status';
const MAX_STEPS_PER_BLOCK=8;
const MAX_REPORTED=128;
const CLOCKS=['root','game'];

function createStepClock(sampleRate){
 let clock=null,pending=[];
 const threshold=SYNC_THRESHOLD_MS*sampleRate/1000;
 const stats={syncs:0,shiftMax:0,skipped:0};
 const frameOf=n=>clock.anchor+Math.round(n*clock.stepFrames);
 return {
  get running(){return clock!==null},
  start(anchor,stepFrames){clock={anchor,stepFrames,n:0};pending=[]},
  stop(){clock=null;pending=[]},
  /** Re-anchors to the page clock; returns how many steps it skipped. */
  sync(n,at,currentFrame){
   if(!clock||!Number.isInteger(n)||!Number.isFinite(at))return 0;
   const shift=Math.round(at*sampleRate-n*clock.stepFrames)-clock.anchor;
   if(Math.abs(shift)<threshold){pending=[];return 0}
   if(pending.length&&Math.sign(pending[0])!==Math.sign(shift))pending=[];
   pending.push(shift);
   if(pending.length<SYNC_CONFIRM)return 0;
   const move=pending.reduce((a,b)=>Math.abs(b)<Math.abs(a)?b:a);
   pending=[];
   clock.anchor+=move;
   stats.syncs++;stats.shiftMax=Math.max(stats.shiftMax,Math.abs(move));
   let skipped=0;
   while(frameOf(clock.n)<currentFrame-clock.stepFrames){clock.n++;skipped++}
   stats.skipped+=skipped;
   return skipped;
  },
  /** Steps due before untilFrame, as [{n, frame}]. */
  due(untilFrame){
   const out=[];
   if(!clock)return out;
   for(let i=0;i<MAX_STEPS_PER_BLOCK;i++){
    const frame=frameOf(clock.n);
    if(frame>=untilFrame)break;
    out.push({n:clock.n,frame});
    clock.n++;
   }
   return out;
  },
  takeStats(){const out={...stats};stats.syncs=0;stats.shiftMax=0;stats.skipped=0;return out}
 };
}

/**
 * notes: the worklet note controller ({ready, play(note,{chipMask,layerChip}) → {token}, release(note, token)}).
 */
export function createWorkletGenerators({sampleRate,notes}){
 if(!(sampleRate>0))throw new RangeError('sample rate');
 const arp=createWorkletGameArp({sampleRate});
 const clocks={root:createStepClock(sampleRate),game:createStepClock(sampleRate)};
 const owners=new Map();
 let run=null,transport=null;
 let steps=[],events=[],dropped=0,lead=null,error=null;
 const counts={steps:0,notes:0,skipped:{}};
 const skip=reason=>{counts.skipped[reason]=(counts.skipped[reason]??0)+1};
 const report=(list,entry)=>{list.push(entry);if(list.length>MAX_REPORTED){list.shift();dropped++}};

 // The page's playOne()/stop() for source 'game', on the worklet's controller.
 function playOne(note,key,chipMask,layer,frame){
  if(!chipMask.some(chip=>run.voiceEnabled[chip])){skip('voice-disabled');return}
  const prior=owners.get(key);
  if(prior){notes.release(prior.note,prior.token);report(events,['off',prior.note,key,frame])}
  const layerChip=layer&&chipMask.length===1?chipMask[0]:null;
  const {token}=notes.play(note,{chipMask,layerChip});
  owners.set(key,{note,token});
  counts.notes++;
  report(events,['on',note,key,frame]);
 }
 function play(note,frame){
  note=resolveNote(transport,note);
  const chips=routeMask(run.route);
  if(dispatchUsesLayer(run.route,'game',chips)){
   for(const chip of chips)playOne(note,'game@'+chip,[chip],true,frame);
   return;
  }
  playOne(note,'game',chips,false,frame);
 }
 function stop(note,frame){
  note=resolveNote(transport,note);
  const chips=routeMask(run.route);
  const keys=dispatchUsesLayer(run.route,'game',chips)?chips.map(chip=>'game@'+chip):['game'];
  for(const key of keys){
   const owner=owners.get(key);
   if(!owner||owner.note!==note)continue;
   owners.delete(key);
   notes.release(note,owner.token);
   report(events,['off',note,key,frame]);
  }
 }
 function apply(list){
  for(const event of list){
   if(event.type==='off')stop(event.note,event.frame);
   else play(event.note,event.frame);
  }
 }
 const resolver=()=>note=>resolveNote(transport,note);
 function stopGame(frame){
  clocks.game.stop();
  apply(arp.stop(frame));
 }
 function stopAll(frame){
  if(run)stopGame(frame);
  clocks.root.stop();
  // Anything still owned (a route change between note-on and note-off) is released too.
  for(const [key,owner] of owners){notes.release(owner.note,owner.token);report(events,['off',owner.note,key,frame])}
  owners.clear();
  arp.reset();
 }
 function gateOffs(frame){
  const offs=arp.releaseDue(frame);
  if(!offs.length)return;
  apply(offs);
  report(steps,{run:run.id,clock:'gate',frame:offs[0].frame});
 }
 const configure=message=>{
  for(const key of ['rootOn','gameOn','seqPreview'])if(typeof message[key]==='boolean')run[key]=message[key];
  if(Number.isInteger(message.previewRootMidi))run.previewRootMidi=message.previewRootMidi;
  if(typeof message.route==='string')run.route=message.route;
  if(Array.isArray(message.voiceEnabled))run.voiceEnabled=[0,1,2].map(chip=>message.voiceEnabled[chip]===true);
 };

 return {
  get running(){return run!==null},
  get owners(){return new Map(owners)},
  /** A control message, applied in order with the page's note ops. */
  control(message,mirroredTransport,frame){
   transport=mirroredTransport??transport;
   const action=message?.action;
   if(action==='stop'){if(run)stopAll(frame);run=null;return}
   if(action==='config'){if(run)configure(message);return}
   if(action==='release-root'){
    if(run?.rootOn&&transport)arp.releaseRoot(message.note,{notes:arpNotes(transport),pattern:transport.arp.pattern});
    return;
   }
   if(action==='sync'){
    if(!run||message.run!==run.id||!CLOCKS.includes(message.clock))return;
    const skipped=clocks[message.clock].sync(message.n,message.at,frame);
    if(skipped)arp.skip({[message.clock]:skipped});
    return;
   }
   if(action!=='run')throw new RangeError('generators action '+action);
   if(run)stopAll(frame);
   run=null;
   if(!transport){error='no transport mirrored';return}
   if(!notes?.ready){error='note controller not ready';return}
   run={id:message.run,rootOn:false,gameOn:false,seqPreview:false,previewRootMidi:48,route:'all',voiceEnabled:[true,true,true]};
   configure(message);
   const anchor=Math.round(message.firstAt*sampleRate);
   lead=anchor-frame;error=null;
   if(run.rootOn)clocks.root.start(anchor,arpStepMs(transport)*sampleRate/1000);
   if(run.gameOn)clocks.game.start(anchor,gameStepMs(transport)*sampleRate/1000);
  },
  /** Plays everything due before blockEnd. */
  block(blockEnd,mirroredTransport){
   if(!run)return;
   transport=mirroredTransport??transport;
   if(!transport)return;
   const due=[];
   for(const clock of CLOCKS)for(const step of clocks[clock].due(blockEnd))due.push({...step,clock});
   // Root before Game on the same frame (G1); otherwise in frame order.
   due.sort((a,b)=>a.frame-b.frame||(a.clock==='root'?-1:1));
   const resolve=resolver();
   for(const step of due){
    if(!run)break;
    if(step.clock==='root'){
     if(!clocks.root.running)continue;
     const result=arp.rootStep({notes:arpNotes(transport),pattern:transport.arp.pattern,
      phraseLength:transport.game.sequence.length,gameTrigger:transport.arp.gameTrigger,resolve});
     counts.steps++;
     report(steps,{run:run.id,clock:'root',n:step.n,frame:step.frame,highlight:result.highlight,status:result.status});
     continue;
    }
    if(!clocks.game.running)continue;
    gateOffs(step.frame-1);
    const result=arp.gameStep({frame:step.frame,stepFrames:gameStepMs(transport)*sampleRate/1000,
     arpEnabled:run.rootOn,heldNotes:activeNotes(transport),seqPreview:run.seqPreview,previewRootMidi:run.previewRootMidi,
     sequence:transport.game.sequence,resolve});
    counts.steps++;
    if(result.stop){
     // The page's gameTick() with no root: gameStop(), and the Game clock stops.
     apply(result.events);clocks.game.stop();
     report(steps,{run:run.id,clock:'game',n:step.n,frame:step.frame,stop:true});
     continue;
    }
    apply(result.events);
    report(steps,{run:run.id,clock:'game',n:step.n,frame:step.frame,stepIndex:result.stepIndex,
     highlight:result.highlight,status:result.status});
   }
   if(run&&clocks.game.running)gateOffs(blockEnd-1);
  },
  hasReport:()=>steps.length>0||events.length>0||lead!==null||error!==null,
  takeReport(){
   const sync=Object.fromEntries(CLOCKS.map(clock=>[clock,clocks[clock].takeStats()]));
   const out={sampleRate,steps,events,dropped,lead,error,counts:{...counts,skipped:{...counts.skipped}},sync};
   steps=[];events=[];dropped=0;lead=null;error=null;
   counts.steps=0;counts.notes=0;counts.skipped={};
   return out;
  }
 };
}
