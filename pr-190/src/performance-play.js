import {selectRoot,stepMilliseconds,resolveGameRoot,gamePhraseBoundary} from './arp-composition.js?v=0.19.0+20261123T184822635Z';
import {defaultSequence,sequenceEvent,sequenceForStyle} from './game-step-sequencer.js?v=0.19.0+20261123T184822635Z';

// Step grid plus the Game Arp and root-arp clocks. The studio still owns play(),
// stop(), and the preset snapshot; this module asks those to run.
export function mountPerformance({
 $,names,keyboardState,arp,game,directOwned,play,stop,silenceSidOutput,refreshPresetDirty,getArpKeyVisual,
 performanceNote=note=>note,
 gameEnabled,arpEnabled,activeNotes,arpNotes,
 getSeqState,setSeqState,isSeqPreview,setSeqPreview,getActiveSeqStep,setActiveSeqStep,performanceArp,
 alignDrumTransport
}){
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
  const seqState=getSeqState();
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
    seqState.steps[index].offset=Number(pitch.value);
    value.textContent=(Number(pitch.value)>0?'+':'')+pitch.value;
    modifiedStepPhrase();
   });
   pitchWrap.append(pitch,value);
   const gate=document.createElement('button');gate.type='button';gate.className='seq-gate';
   function displayGate(){
    const enabled=seqState.steps[index].gate;
    gate.textContent=enabled?'ON':'REST';
    gate.setAttribute('aria-pressed',String(enabled));
    gate.setAttribute('aria-label','Step '+(index+1)+' gate '+(enabled?'on':'rest'));
   }
   displayGate();
   gate.addEventListener('click',()=>{
    seqState.steps[index].gate=!seqState.steps[index].gate;
    displayGate();modifiedStepPhrase();
   });
   const lengthWrap=document.createElement('div');lengthWrap.className='seq-length-group';
   const length=document.createElement('input');length.type='range';length.className='seq-duration';
   length.min='25';length.max='100';length.step='5';length.value=String(step.duration);
   length.setAttribute('aria-label','Step '+(index+1)+' note length percent');
   const lengthValue=document.createElement('output');lengthValue.className='seq-duration-value';
   lengthValue.textContent=step.duration+'%';
   length.addEventListener('input',()=>{
    seqState.steps[index].duration=Number(length.value);
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
  const seqState=getSeqState();
  $('gameArpStyle').value='custom';
  $('seqStatus').textContent='Custom '+seqState.length+'-step phrase · changes take effect on the next step.';
  refreshPresetDirty();
 }
 function gameStop(){
  if(game.timer!==null){clearInterval(game.timer);game.timer=null}
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
  setSeqState(phrase);
  renderSequenceSteps();
  $('seqStatus').textContent=phraseLabel()+' · '+phrase.length+'-step phrase. Edit a step to make it Custom.';
  return true;
 }
 function gameTick(){
  const seqState=getSeqState();
  const root=gameRoot();
  if(root===null){gameStop();$('arpStatus').textContent='No notes held';return}
  if(game.gateTimer!==null){clearTimeout(game.gateTimer);game.gateTimer=null}
  if(game.last!==null)stop(game.last,'game');
  const event=sequenceEvent(root,seqState,game.step++);
  highlightStep(event.index);
  game.last=null;
  if(!event.gate){
   getArpKeyVisual().clear('game');
   $('arpStatus').textContent=phraseLabel()+' step '+(event.index+1)+' · rest';
   return;
  }
  game.last=performanceNote(event.note);
  play(game.last,'game');getArpKeyVisual().show(game.last,'game');
  $('arpStatus').textContent=phraseLabel()+' step '+(event.index+1)+' · '+names[root%12]+(Math.floor(root/12)-1);
  if(event.duration<100){
   const sounding=event.note,clock=game.step;
   const bpm=Number($('arpSync').checked?$('masterBpm').value:$('arpBpm').value);
   game.gateTimer=setTimeout(()=>{
    if(game.step!==clock||game.last!==sounding)return;
    stop(sounding,'game');game.last=null;getArpKeyVisual().clear('game');game.gateTimer=null;
   },stepMilliseconds(bpm,$('gameRate').value)*event.duration/100);
  }
 }
 function arpTick(){
  const notes=arpNotes();
  if(!notes.length){
   arp.root=null;
   if(!gameEnabled())arpStopVoice();
   $('arpStatus').textContent='No notes held';return;
  }
  const note=performanceNote(selectRoot(notes,$('arpPattern').value,arp.step++));
  getArpKeyVisual().show(note,'root');
  if(gameEnabled()){
   const seqState=getSeqState();
   if(arp.root===null||gamePhraseBoundary(game.step,seqState.length))arp.root=note;
   $('arpStatus').textContent='Root Arp · '+names[note%12]+(Math.floor(note/12)-1)+' · '+notes.length+' notes';
   return;
  }
  arp.root=note;
  if(arp.last!==null)stop(arp.last,'arp');
  arp.last=note;play(note,'arp');
  $('arpStatus').textContent='Root Arp · '+names[note%12]+(Math.floor(note/12)-1)+
   ' · '+notes.length+' notes';
 }
 function stopGenerators(){
  gameStop();
  if(arp.timer!==null){clearInterval(arp.timer);arp.timer=null}
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
   arp.latched.clear();
   const heard=new Set();
   for(const note of arp.held){
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
  const bpm=Number($('arpSync').checked?$('masterBpm').value:$('arpBpm').value);
  if(arpEnabled()){
   arpTick();
   arp.timer=setInterval(arpTick,stepMilliseconds(bpm,$('arpRate').value));
  }
  if(gameEnabled()){
   gameTick();
   game.timer=setInterval(gameTick,stepMilliseconds(bpm,$('gameRate').value));
  }
 }
 function gameRestart(){restartGenerators()}
 function arpRestart(){restartGenerators()}
 renderSequenceSteps();
 loadBuiltInPhrase($('gameArpStyle').value);
 $('seqLength').addEventListener('change',()=>{
  const seqState=getSeqState();
  seqState.length=Number($('seqLength').value);
  renderSequenceSteps();modifiedStepPhrase();gameRestart();
 });
 $('seqReset').addEventListener('click',()=>{
  if(!window.confirm('Reset all 16 custom steps?'))return;
  setSeqState(defaultSequence());renderSequenceSteps();modifiedStepPhrase();gameRestart();
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
  stopGenerators();arp.held.clear();arp.latched.clear();
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
  if($('arpLatch').checked)arp.held.forEach(note=>arp.latched.add(note));
  else arp.latched.clear();
  restartGenerators();refreshPresetDirty();
 });
 ['arpPattern','arpRate'].forEach(id=>$(id).addEventListener('change',arpRestart));
 $('arpBpm').addEventListener('input',()=>{
  $('bpmValue').textContent=$('arpBpm').value;restartGenerators();
 });
 $('arpClear').addEventListener('click',()=>{
  // Clear stored notes only. Physical held keys and direct voice owners remain.
  arp.latched.clear();arp.root=null;arp.step=0;game.step=0;
  if(gameEnabled()||arpEnabled())restartGenerators();
  $('arpStatus').textContent='Latch cleared';
 });
 return {gameStop,arpStopVoice,restartGenerators,stopGenerators,gameRestart,setSeqTransportLabel,renderSequenceSteps,loadBuiltInPhrase};
}
