import {resolveGameRoot} from './arp-composition.js?v=__BUILD_ID__';
import {arpStep,gameStep} from './sequencer-steps.js?v=__BUILD_ID__';
import {arpStepMs,gameStepMs} from './transport-state.js?v=__BUILD_ID__';
import {defaultSequence,sequenceForStyle} from './game-step-sequencer.js?v=__BUILD_ID__';
import {createGridTimer} from './grid-timer.js?v=__BUILD_ID__';

// Step grid plus the Game Arp and root-arp clocks. The studio still owns play(),
// stop(), and the preset snapshot; this module asks those to run.
export function mountPerformance({
 $,names,keyboardState,arp,game,directOwned,play,stop,silenceSidOutput,refreshPresetDirty,getArpKeyVisual,
 performanceNote=note=>note,
 gameEnabled,arpEnabled,activeNotes,arpNotes,latchOn,
 isSeqPreview,setSeqPreview,getActiveSeqStep,setActiveSeqStep,performanceArp,
 alignDrumTransport,transport,
 // Worklet Game Arp timing (G3): {active(), leadMs, run({rootOn,seqPreview,delayMs}) → run id,
 // sync({clock,n,delayMs}), stop()}. Read at each restart; null keeps everything on the page.
 workletGenerators=null,
 // Step clocks (grid-timer.js); injectable for tests. now() is in milliseconds.
 now=()=>performance.now(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)
}){
 // Root Arp and Game Arp step on the grid like the drums: a busy page delays a step
 // at most until it is free; passed steps are skipped and the step counters move
 // past them, so the arp pattern and the Game Arp phrase stay in phase with the bar.
 const arpTimer=createGridTimer({now,setTimer,clearTimer});
 const gameTimer=createGridTimer({now,setTimer,clearTimer});
 function clearStepHighlight(){
  const activeSeqStep=getActiveSeqStep();
  if(activeSeqStep<0)return;
  const previous=$('seqGrid').children[activeSeqStep];
  previous?.classList.remove('is-playing');previous?.removeAttribute('aria-current');
  setActiveSeqStep(-1);
 }
 function highlightStep(index){
  if(getActiveSeqStep()===index)return;
  clearStepHighlight();
  const element=$('seqGrid').children[index];
  if(!element)return;
  element.classList.add('is-playing');element.setAttribute('aria-current','step');
  setActiveSeqStep(index);
 }
 function setSeqTransportLabel(){
  const seqPreview=isSeqPreview();
  $('seqRun').textContent=seqPreview?'▶ Previewing':'▶ Preview';
  $('seqRun').setAttribute('aria-pressed',String(seqPreview));
 }
 function renderSequenceSteps(){
  const seqState=transport.sequence;
  const fragment=document.createDocumentFragment();
  seqState.steps.forEach((step,index)=>{
   const cell=document.createElement('div');cell.className='seq-step';cell.dataset.step=String(index);
   cell.hidden=index>=seqState.length;
   const number=document.createElement('span');number.className='seq-number';number.textContent=String(index+1);
   const pitchWrap=document.createElement('div');pitchWrap.className='seq-pitch-wrap';
   const pitch=document.createElement('input');pitch.type='range';pitch.className='seq-note';
   pitch.min='-12';pitch.max='24';pitch.step='1';pitch.value=String(step.offset);
   pitch.setAttribute('aria-label','Step '+(index+1)+' pitch offset in semitones');
   const value=document.createElement('output');value.className='seq-note-value';
   value.textContent=(step.offset>0?'+':'')+step.offset;
   pitch.addEventListener('input',()=>{
    transport.updateStep(index,{offset:Number(pitch.value)});
    value.textContent=(Number(pitch.value)>0?'+':'')+pitch.value;
    modifiedStepPhrase();
   });
   pitchWrap.append(pitch,value);
   const gate=document.createElement('button');gate.type='button';gate.className='seq-gate';
   function displayGate(){
    const enabled=transport.sequence.steps[index].gate;
    gate.textContent=enabled?'ON':'REST';
    gate.setAttribute('aria-pressed',String(enabled));
    gate.setAttribute('aria-label','Step '+(index+1)+' gate '+(enabled?'on':'rest'));
   }
   displayGate();
   gate.addEventListener('click',()=>{
    transport.updateStep(index,{gate:!transport.sequence.steps[index].gate});
    displayGate();modifiedStepPhrase();
   });
   const lengthWrap=document.createElement('div');lengthWrap.className='seq-length-group';
   const length=document.createElement('input');length.type='range';length.className='seq-duration';
   length.min='25';length.max='100';length.step='5';length.value=String(step.duration);
   length.setAttribute('aria-label','Step '+(index+1)+' note length percent');
   const lengthValue=document.createElement('output');lengthValue.className='seq-duration-value';
   lengthValue.textContent=step.duration+'%';
   length.addEventListener('input',()=>{
    transport.updateStep(index,{duration:Number(length.value)});
    lengthValue.textContent=length.value+'%';
    modifiedStepPhrase();
   });
   lengthWrap.append(length,lengthValue);
   cell.append(number,pitchWrap,gate,lengthWrap);
   fragment.append(cell);
  });
  $('seqGrid').replaceChildren(fragment);
  $('seqLength').value=String(seqState.length);
  setActiveSeqStep(-1);
 }
 function modifiedStepPhrase(){
  $('gameArpStyle').value='custom';
  $('seqStatus').textContent='Custom '+transport.sequence.length+'-step phrase · changes take effect on the next step.';
  refreshPresetDirty();
 }
 function gameStop(){
  if(game.worklet){game.worklet=false;game.workletRun=null;workletGenerators?.stop()}
  gameTimer.stop();game.timer=null;
  if(game.gateTimer!==null){clearTimeout(game.gateTimer);game.gateTimer=null}
  if(game.last!==null){stop(game.last,'game');game.last=null}
  clearStepHighlight();
  getArpKeyVisual().clear('game');
 }
 function arpStopVoice(){
  if(arp.last!==null){stop(arp.last,'arp');arp.last=null}
  getArpKeyVisual().clear('root');
 }
 function gameRoot(){
  return resolveGameRoot({
   arpEnabled:arpEnabled(),arpRoot:arp.root,heldNotes:activeNotes(),
   seqPreview:isSeqPreview(),previewRootMidi:(keyboardState.octave+1)*12
  });
 }
 function phraseLabel(){
  if($('gameArpStyle').value==='custom')return 'Custom';
  const selected=$('gameArpStyle').selectedOptions[0];
  if(selected&&selected.text)return selected.text;
  return 'Action';
 }
 // Built-in styles replace the visible phrase. Custom keeps the steps already shown.
 function loadBuiltInPhrase(style){
  const phrase=sequenceForStyle(style);
  if(!phrase)return false;
  transport.setSequence(phrase);
  renderSequenceSteps();
  $('seqStatus').textContent=phraseLabel()+' · '+phrase.length+'-step phrase. Edit a step to make it Custom.';
  return true;
 }
 // Step decisions live in sequencer-steps.js; these adapters apply them.
 const noteName=note=>names[note%12]+(Math.floor(note/12)-1);
 function applyStep(result){
  for(const event of result.events){
   if(event.type==='off')stop(event.note,event.source);
   else play(event.note,event.source);
  }
  for(const [kind,note] of Object.entries(result.highlight)){
   if(note===null)getArpKeyVisual().clear(kind);
   else getArpKeyVisual().show(note,kind);
  }
 }
 function gameTick(){
  const root=gameRoot();
  if(root===null){gameStop();$('arpStatus').textContent='No notes held';return}
  if(game.gateTimer!==null){clearTimeout(game.gateTimer);game.gateTimer=null}
  const result=gameStep({step:game.step,last:game.last},
   {root,sequence:transport.sequence,resolve:performanceNote});
  game.step=result.clock.step;game.last=result.clock.last;
  highlightStep(result.stepIndex);
  applyStep(result);
  const {status}=result;
  $('arpStatus').textContent=phraseLabel()+' step '+(status.index+1)+' · '+
   (status.type==='rest'?'rest':noteName(status.root));
  if(result.gate){
   const sounding=result.gate.note,clock=game.step;
   game.gateTimer=setTimeout(()=>{
    if(game.step!==clock||game.last!==sounding)return;
    stop(sounding,'game');game.last=null;getArpKeyVisual().clear('game');game.gateTimer=null;
   },gameStepMs(transport.getState())*result.gate.fraction);
  }
 }
 function arpTick(){
  const notes=arpNotes();
  const result=arpStep({step:arp.step,root:arp.root,last:arp.last},{
   notes,pattern:transport.arp.pattern,gameOn:gameEnabled(),
   gameStep:game.step,phraseLength:transport.sequence.length,resolve:performanceNote
  });
  Object.assign(arp,result.clock);
  applyStep(result);
  $('arpStatus').textContent=result.status.type==='idle'?'No notes held':
   'Root Arp · '+noteName(result.status.note)+' · '+result.status.count+' notes';
 }
 function stopArpClock(){arpTimer.stop();arp.timer=null}
 function stopGenerators(){
  gameStop();
  stopArpClock();
  arpStopVoice();arp.root=null;
 }
 function releaseDirectNotes(){
  const seen=new Set();
  for(const physical of directOwned){
   const resolved=performanceNote(physical);
   if(seen.has(resolved))continue;
   seen.add(resolved);
   stop(physical);
  }
  directOwned.clear();
 }
 function restartGenerators(){
  const seqPreview=isSeqPreview();
  stopGenerators();arp.step=0;game.step=0;
  if(!gameEnabled()&&!arpEnabled()){
   // Return physically held keys to direct sound; never retain stale latches.
   transport.clearLatched();
   const heard=new Set();
   for(const note of transport.held){
    const resolved=performanceNote(note);
    directOwned.add(note);
    if(heard.has(resolved))continue;
    heard.add(resolved);
    play(note);
   }
   $('arpStatus').textContent='Arps off';return;
  }
  // Transitioning from direct polyphony must release EVERY physical owner first.
  releaseDirectNotes();
  if(!activeNotes().length&&!seqPreview){$('arpStatus').textContent='No notes held';return}
  const timing=transport.getState();
  if(gameEnabled()&&workletGenerators?.active()){startWorkletGenerators(timing,seqPreview);return}
  if(arpEnabled()){
   arp.timer=arpTimer;
   arpTimer.start({ms:arpStepMs(timing),onStep:({skipped})=>{arp.step+=skipped;arpTick()}});
  }
  if(gameEnabled()){
   game.timer=gameTimer;
   gameTimer.start({ms:gameStepMs(timing),onStep:({skipped})=>{game.step+=skipped;gameTick()}});
  }
 }
 // The worklet plays the Game Arp (and picks the Root Arp root) from leadMs ahead. The page's
 // grid timers keep running silently, only to keep the worklet on the page clock.
 function startWorkletGenerators(timing,seqPreview){
  const delayMs=workletGenerators.leadMs??50;
  const run=workletGenerators.run({rootOn:arpEnabled(),seqPreview,delayMs});
  if(run===null||run===undefined)return;
  game.worklet=true;game.workletRun=run;
  const sync=clock=>({n,nextAt})=>{
   if(game.workletRun===run&&Number.isFinite(nextAt))workletGenerators.sync({clock,n:n+1,delayMs:nextAt-now()});
  };
  if(arpEnabled()){
   arp.timer=arpTimer;
   arpTimer.start({ms:arpStepMs(timing),delayMs,onStep:sync('root')});
  }
  game.timer=gameTimer;
  gameTimer.start({ms:gameStepMs(timing),delayMs,onStep:sync('game')});
 }
 /** Step highlight, key highlight and status line from the worklet's step reports. */
 function applyWorkletReport(report){
  for(const step of report?.steps??[]){
   if(!game.worklet||step.run!==game.workletRun)continue;
   if(step.clock==='gate'){getArpKeyVisual().clear('game');continue}
   if(step.clock==='root'){
    applyStep({events:[],highlight:step.highlight??{}});
    $('arpStatus').textContent=step.status?.type==='idle'?'No notes held':
     'Root Arp · '+noteName(step.status.note)+' · '+step.status.count+' notes';
    continue;
   }
   if(step.stop){
    // The worklet's gameTick() found no root: its Game clock has stopped, as the page's would.
    gameTimer.stop();game.timer=null;
    clearStepHighlight();getArpKeyVisual().clear('game');
    $('arpStatus').textContent='No notes held';
    continue;
   }
   highlightStep(step.stepIndex);
   applyStep({events:[],highlight:step.highlight??{}});
   const status=step.status;
   $('arpStatus').textContent=phraseLabel()+' step '+(status.index+1)+' · '+
    (status.type==='rest'?'rest':noteName(status.root));
  }
 }
 function gameRestart(){restartGenerators()}
 function arpRestart(){restartGenerators()}
 renderSequenceSteps();
 loadBuiltInPhrase($('gameArpStyle').value);
 $('seqLength').addEventListener('change',()=>{
  transport.setSequenceLength(Number($('seqLength').value));
  renderSequenceSteps();modifiedStepPhrase();gameRestart();
 });
 $('seqReset').addEventListener('click',()=>{
  if(!window.confirm('Reset all 16 custom steps?'))return;
  transport.setSequence(defaultSequence());renderSequenceSteps();modifiedStepPhrase();gameRestart();
 });
 $('seqRun').addEventListener('click',()=>{
  setSeqPreview(true);$('gameArpStyle').value='custom';
  performanceArp.set({gameOn:true});
  setSeqTransportLabel();restartGenerators();alignDrumTransport?.();refreshPresetDirty();
 });
 $('seqStop').addEventListener('click',()=>{
  setSeqPreview(false);
  performanceArp.set({gameOn:false});
  setSeqTransportLabel();
  stopGenerators();transport.clearNotes();
  silenceSidOutput();
  refreshPresetDirty();
 });
 setSeqTransportLabel();
 $('gameArpOn').addEventListener('change',()=>{
  if(!$('gameArpOn').checked){setSeqPreview(false);setSeqTransportLabel()}
  restartGenerators();refreshPresetDirty();
 });
 $('gameArpStyle').addEventListener('change',()=>{
  loadBuiltInPhrase($('gameArpStyle').value);
  refreshPresetDirty();
  gameRestart();
 });
 $('gameRate').addEventListener('change',gameRestart);
 $('arpOn').addEventListener('change',()=>{restartGenerators();refreshPresetDirty()});
 $('arpLatch').addEventListener('change',()=>{
  // The arp-state slice updates before this change event; mirror it first.
  transport.set({arp:{latch:latchOn()}});
  if(transport.arp.latch)transport.latchHeld();
  else transport.clearLatched();
  restartGenerators();refreshPresetDirty();
 });
 ['arpPattern','arpRate'].forEach(id=>$(id).addEventListener('change',arpRestart));
 $('arpBpm').addEventListener('input',()=>{
  $('bpmValue').textContent=$('arpBpm').value;restartGenerators();
 });
 $('arpClear').addEventListener('click',()=>{
  // Clear stored notes only. Physical held keys and direct voice owners remain.
  transport.clearLatched();arp.root=null;arp.step=0;game.step=0;
  if(gameEnabled()||arpEnabled())restartGenerators();
  $('arpStatus').textContent='Latch cleared';
 });
 return {gameStop,arpStopVoice,stopArpClock,restartGenerators,stopGenerators,gameRestart,setSeqTransportLabel,renderSequenceSteps,loadBuiltInPhrase,applyWorkletReport};
}
