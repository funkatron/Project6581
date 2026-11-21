import {needsAudioResume} from './sid-note-gate.js?v=0.21.9+20261121T185247320Z';
import {selectRoot} from './arp-composition.js?v=0.21.9+20261121T185247320Z';
import {countHeldResolvingTo} from './western-scales.js?v=0.21.9+20261121T185247320Z';

// Physical keys and the on-screen keyboard. The studio still owns play(), stop(),
// and the arp clock; this module asks those to run.
export function createKeyGesture({
  audioTiming,sidEventLog,getSidContext,sidMusicalInputBlocked,armSidResume,hasController,countKeyPress,
  activeNotes,arp,game,gameEnabled,arpEnabled,latchOn,directOwned,play,stop,restartGenerators,stopGenerators,
  gameRestart,arpStopVoice,arpNotes,isSeqPreview,performanceNote,$
}){
 if(!latchOn)latchOn=()=>Boolean($('arpLatch')?.checked);
 let queuedKeyNotes=[];
 function flushQueuedKeys(){
  const sidContext=getSidContext();
  if(sidContext?.state!=='running')return;
  const notes=queuedKeyNotes;queuedKeyNotes=[];
  for(const note of notes)beginKey(note,true);
 }
 function beginKey(note,fromQueue=false){
  if(!fromQueue){
   audioTiming.keyAt=performance.now();
   audioTiming.keyEnergyMs=null;
   audioTiming.keyBufferRemainderMs=null;
   audioTiming.keyToOutputEstimateMs=null;
   audioTiming.keyEnergyMissed=false;
  }
  if(sidMusicalInputBlocked()){
   audioTiming.keyAt=null;
   if(sidEventLog.enabled)sidEventLog.add('note-skipped',{note,reason:'engine busy',action:'key-down'});
   return;
  }
  const sidContext=getSidContext();
  if(sidContext&&needsAudioResume(sidContext.state)){
   armSidResume();
   if(!queuedKeyNotes.includes(note))queuedKeyNotes.push(note);
   if(sidContext.state==='running')flushQueuedKeys();
   return;
  }
  if(hasController())countKeyPress();
  const hadNotes=activeNotes().length;
  if(!arp.held.has(note)){
   const firstPhysical=arp.held.size===0;
   arp.held.add(note);
   if((gameEnabled()||arpEnabled())&&latchOn()){
    if(firstPhysical)arp.latched.clear();
    arp.latched.add(note);
   }
  }
  if(!gameEnabled()&&!arpEnabled()){
   const resolved=performanceNote(note);
   const playNow=countHeldResolvingTo(arp.held,performanceNote,resolved)===1;
   if(playNow)play(note);
   directOwned.add(note);
   return;
  }
  const restart=!hadNotes||(!game.timer&&!arp.timer);
  if(restart)restartGenerators();
 }
 function keyDown(note){beginKey(note)}
 function keyUp(note){
  arp.held.delete(note);
  if(!gameEnabled()&&!arpEnabled()){
   const resolved=performanceNote(note);
   directOwned.delete(note);
   if(countHeldResolvingTo(arp.held,performanceNote,resolved)===0)stop(note);
   return;
  }
  if(directOwned.delete(note))stop(note);
  if(arp.held.size===0&&(!latchOn()||arp.latched.size===0)&&!isSeqPreview()){
   stopGenerators();$('arpStatus').textContent='No notes held';return;
  }
  // Game Arp keeps its clock while the held set changes; gameTick() picks up the new root.
  if(arpEnabled()&&!latchOn()&&arp.root===note){
   // Keep the root valid, without firing an extra off-grid arpeggio note.
   const notes=arpNotes();
   arp.root=notes.length?selectRoot(notes,$('arpPattern').value,arp.step):null;
   if(!gameEnabled())arpStopVoice();
  }
 }
 return {flushQueuedKeys,beginKey,keyDown,keyUp};
}

export function mountKeyboard(deps){
 const {$,keys,names,keyboardState,traceInput,panic,restartGenerators,gameEnabled,latchOn,isSeqPreview,arp,
  pitchInScale=()=>true,refreshPresetDirty,getArpKeyVisual}=deps;
 const {keyDown,keyUp,flushQueuedKeys}=createKeyGesture(deps);
 const MIN_OCTAVE=0,MAX_OCTAVE=7;
 const compactKeyboard=()=>matchMedia('(max-width:900px), (max-height:620px)').matches;
 function renderKeyboard(){
  const resumePreview=isSeqPreview()&&gameEnabled();
  panic();
  arp.held.clear(); // Pointer capture cannot survive keyboard reconstruction.
  if(!latchOn())arp.latched.clear();
  keys.clear();
  $('keyboard').replaceChildren();
  const start=(keyboardState.octave+1)*12;
  const count=compactKeyboard()?13:25;
  for(let i=0;i<count;i++){
   const note=start+i;
   const key=document.createElement('button');
   key.type='button';
   const inScale=pitchInScale(note);
   key.className='key'+(names[note%12].includes('♯')?' black':'')+(inScale?' scale-in':' scale-out');
   key.dataset.note=String(note);
   key.textContent=names[note%12]+(Math.floor(note/12)-1);
   key.setAttribute('aria-label','Play '+key.textContent);
   let activePointer=null;
   key.addEventListener('pointerdown',e=>{if(activePointer!==null)return;e.preventDefault();activePointer=e.pointerId;key.setPointerCapture(e.pointerId);key.classList.add('down');traceInput(note,'pointer','down',()=>keyDown(note))});
   const end=e=>{if(activePointer!==e.pointerId)return;activePointer=null;key.classList.remove('down');traceInput(note,'pointer',e.type,()=>keyUp(note))};
   key.addEventListener('pointerup',end);
   key.addEventListener('pointercancel',end);
   key.addEventListener('lostpointercapture',end);
   $('keyboard').append(key);
   keys.set(note,key);
  }
  $('octaveLabel').textContent='C'+keyboardState.octave+'–C'+(keyboardState.octave+(compactKeyboard()?1:2));
  $('octaveDown').disabled=keyboardState.octave===MIN_OCTAVE;
  $('octaveUp').disabled=keyboardState.octave===MAX_OCTAVE;
  getArpKeyVisual?.().refresh();
  if(resumePreview)restartGenerators();
 }
 $('octaveDown').addEventListener('click',()=>{keyboardState.octave=Math.max(MIN_OCTAVE,keyboardState.octave-1);renderKeyboard()});
 $('octaveUp').addEventListener('click',()=>{keyboardState.octave=Math.min(MAX_OCTAVE,keyboardState.octave+1);renderKeyboard()});
 let wasCompact=compactKeyboard();
 window.addEventListener('resize',()=>{const compact=compactKeyboard();if(compact!==wasCompact){wasCompact=compact;renderKeyboard()}});
 renderKeyboard();
 function setKeyboardVisible(visible){
  if(!visible){
   // Release held physical keys but leave a latched or previewed sequence playing.
   for(const note of [...arp.held])keyUp(note);
   for(const key of keys.values())key.classList.remove('down');
  }
  $('keyboard').hidden=!visible;
  $('keyboardPanel').classList.toggle('is-collapsed',!visible);
  $('keyboardToggle').setAttribute('aria-expanded',String(visible));
  $('keyboardToggle').textContent=visible?'Hide keyboard ▲':'Show keyboard ▼';
  try{window.localStorage.setItem('project6581.keyboard-visible',visible?'yes':'no')}catch{}
 }
 $('keyboardToggle').addEventListener('click',()=>{
  const visible=!$('keyboard').hidden;
  setKeyboardVisible(!visible);
 });
 try{if(window.localStorage.getItem('project6581.keyboard-visible')==='no')setKeyboardVisible(false)}catch{}
 const layout='awsedftgyhujkolp;';
 window.addEventListener('keydown',e=>{if(e.repeat||e.target.matches('input,select,button,textarea,[contenteditable="true"]'))return;const idx=layout.indexOf(e.key.toLowerCase());if(idx>=0){const note=(keyboardState.octave+1)*12+idx;const key=keys.get(note);if(key){e.preventDefault();key.classList.add('down');traceInput(note,'keyboard','down',()=>keyDown(note))}}});
 window.addEventListener('keyup',e=>{const idx=layout.indexOf(e.key.toLowerCase());if(idx>=0){const note=(keyboardState.octave+1)*12+idx;keys.get(note)?.classList.remove('down');if(arp.held.has(note))traceInput(note,'keyboard','up',()=>keyUp(note));else keyUp(note)}});
 return {flushQueuedKeys,keyDown,keyUp,renderKeyboard};
}
