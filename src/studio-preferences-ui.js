export function mountPreferencesDialog($){
 const dialog=$('preferencesDialog');
 if(!dialog)return;
 $('preferencesOpen')?.addEventListener('click',()=>dialog.showModal());
 $('preferencesClose')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
}
export const WORKLET_NOTES_KEY='project6581.worklet-note-controller';
/**
 * Step G2: whether the worklet note controller is requested (off by default; no
 * Prefs control until G3). `?workletNotes=1` turns it on and `?workletNotes=0`
 * off, and the choice is kept in this browser.
 */
export function workletNotesRequested({search=globalThis.location?.search??'',storage=globalThis.localStorage}={}){
 const param=new URLSearchParams(search).get('workletNotes');
 try{
  if(param==='1')storage?.setItem(WORKLET_NOTES_KEY,'on');
  else if(param==='0')storage?.removeItem(WORKLET_NOTES_KEY);
 }catch{/* private mode: this load only */}
 if(param==='1'||param==='0')return param==='1';
 try{return storage?.getItem(WORKLET_NOTES_KEY)==='on'}catch{return false}
}
export const WORKLET_DRUM_TIMING_KEY='project6581.worklet-drum-timing';

/** Whether the loaded worklet modules can play drums (bundle API v6+, self-test passed). */
export function workletDrumsSupported(support){
 return support?.available===true&&support.selfTest?.ok===true&&Number(support.version)>=6;
}

/** Status line under the "Worklet drum timing" checkbox. */
export function workletDrumTimingStatus(enabled,support){
 if(!support)return enabled?'On: waiting for the audio engine to start.':'Off: the page timer plays the drums.';
 if(!workletDrumsSupported(support)){
  const why=!support.available?'sequencer modules did not load':
   support.selfTest?.ok!==true?'self-test failed':'modules too old (v'+support.version+')';
  return 'Unavailable ('+why+'): the page timer plays the drums.';
 }
 return enabled?'On: the audio engine plays the drums (within 3 ms of each step).':'Off: the page timer plays the drums.';
}

/**
 * Prefs → "Worklet drum timing" (on by default since 3c-3; an explicit choice is
 * saved in this browser, so a browser that turned it off stays off).
 * onChange(enabled) runs after the user toggles it. getSupport() returns the
 * worklet's sequencer-support report, or null before the engine starts.
 */
export function mountWorkletDrumTimingPref($,{storage=globalThis.localStorage,getSupport=()=>null,onChange=()=>{}}={}){
 const input=$('workletDrumTiming');
 let enabled=true;
 try{enabled=storage?.getItem(WORKLET_DRUM_TIMING_KEY)!=='off'}catch{enabled=true}
 const refresh=()=>{
  const status=$('workletDrumTimingStatus');
  if(status)status.textContent=workletDrumTimingStatus(enabled,getSupport());
 };
 if(input){
  input.checked=enabled;
  input.addEventListener('change',()=>{
   enabled=input.checked===true;
   try{storage?.setItem(WORKLET_DRUM_TIMING_KEY,enabled?'on':'off')}catch{/* private mode: keep for this session */}
   refresh();
   onChange(enabled);
  });
 }
 refresh();
 return {
  get enabled(){return enabled},
  /** True when the worklet should play the drums now. */
  active(){return enabled&&workletDrumsSupported(getSupport())},
  refresh
 };
}

export const WORKLET_GAME_ARP_TIMING_KEY='project6581.worklet-game-arp-timing';

/** Whether the loaded worklet modules can play the Game Arp (bundle API v9+, self-test passed). */
export function workletGeneratorsSupported(support){
 return support?.available===true&&support.selfTest?.ok===true&&Number(support.version)>=9;
}

/** Status line under the "Worklet Game Arp timing" checkbox. */
export function workletGameArpTimingStatus(enabled,support){
 if(!enabled)return 'Off: the page timer plays the Game Arp.';
 if(!support)return 'On: waiting for the audio engine to start.';
 if(!workletGeneratorsSupported(support)){
  const why=!support.available?'sequencer modules did not load':
   support.selfTest?.ok!==true?'self-test failed':'modules too old (v'+support.version+')';
  return 'Unavailable ('+why+'): the page timer plays the Game Arp.';
 }
 return 'On: the audio engine plays the Game Arp and writes all notes.';
}

/**
 * Prefs → "Worklet Game Arp timing" (Step G3; off by default, saved in this browser).
 * Turning it on also hands note writing to the worklet (G2 note controller).
 */
export function mountWorkletGameArpTimingPref($,{storage=globalThis.localStorage,getSupport=()=>null,onChange=()=>{}}={}){
 const input=$('workletGameArpTiming');
 let enabled=false;
 try{enabled=storage?.getItem(WORKLET_GAME_ARP_TIMING_KEY)==='on'}catch{enabled=false}
 const refresh=()=>{
  const status=$('workletGameArpTimingStatus');
  if(status)status.textContent=workletGameArpTimingStatus(enabled,getSupport());
 };
 if(input){
  input.checked=enabled;
  input.addEventListener('change',()=>{
   enabled=input.checked===true;
   try{storage?.setItem(WORKLET_GAME_ARP_TIMING_KEY,enabled?'on':'off')}catch{/* private mode: keep for this session */}
   refresh();
   onChange(enabled);
  });
 }
 refresh();
 return {
  get enabled(){return enabled},
  /** True when the worklet modules can play the Game Arp and the setting is on. */
  supported(){return enabled&&workletGeneratorsSupported(getSupport())},
  refresh
 };
}
