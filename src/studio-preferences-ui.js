export function mountPreferencesDialog($){
 const dialog=$('preferencesDialog');
 if(!dialog)return;
 $('preferencesOpen')?.addEventListener('click',()=>dialog.showModal());
 $('preferencesClose')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
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
