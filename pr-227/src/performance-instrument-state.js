import {clampVoiceCount} from './sid-engines.js?v=0.31.0+20261128T022520326Z';
import {setControlValue} from './ui-control.js?v=0.31.0+20261128T022520326Z';

const ASSIGNMENTS=['mono','legato','duo','poly'];
const FIELDS=['voiceCount','unisonCount','mode','detune'];
const FIELD_TO_ID={voiceCount:'voiceCount',unisonCount:'unisonCount',mode:'voiceAssign',detune:'detune'};

function pickMode(value,fallback){
  return ASSIGNMENTS.includes(value)?value:fallback;
}

export function createPerformanceInstrumentState($,{onChange,formatDetune}={}){
  const listeners=new Set();
  let syncing=false;
  const state={voiceCount:1,unisonCount:1,mode:'mono',detune:12};

  function readDom(){
    state.voiceCount=clampVoiceCount($('voiceCount')?.value??state.voiceCount);
    state.unisonCount=Math.max(1,Math.min(state.voiceCount,Math.round(Number($('unisonCount')?.value)||1)));
    state.mode=pickMode($('voiceAssign')?.value,state.mode);
    state.detune=Number($('detune')?.value??state.detune);
  }

  function notify(){
    const snapshot={...state};
    for(const fn of listeners)fn(snapshot);
    onChange?.(snapshot);
  }

  function syncDetuneDisplay(){
    const out=$('detuneValue');
    if(out&&formatDetune)out.textContent=formatDetune(state.detune);
  }

  function syncDom({emitChange=true}={}){
    syncing=true;
    try{
      setControlValue($('voiceCount'),state.voiceCount,{emitChange});
      setControlValue($('unisonCount'),state.unisonCount,{emitChange});
      setControlValue($('voiceAssign'),state.mode,{emitChange});
      setControlValue($('detune'),state.detune,{emitChange});
      syncDetuneDisplay();
    }finally{syncing=false}
  }

  function set(patch,{emitChange=true}={}){
    let changed=false;
    if(patch.voiceCount!==undefined){
      const next=clampVoiceCount(patch.voiceCount);
      if(state.voiceCount!==next){state.voiceCount=next;changed=true}
    }
    if(patch.unisonCount!==undefined){
      const max=state.voiceCount;
      const next=Math.max(1,Math.min(max,Math.round(Number(patch.unisonCount)||1)));
      if(state.unisonCount!==next){state.unisonCount=next;changed=true}
    }
    if(patch.mode!==undefined){
      const next=pickMode(String(patch.mode),state.mode);
      if(state.mode!==next){state.mode=next;changed=true}
    }
    if(patch.detune!==undefined){
      const next=Number(patch.detune);
      if(Number.isFinite(next)&&state.detune!==next){state.detune=next;changed=true}
    }
    if(state.unisonCount>state.voiceCount)state.unisonCount=state.voiceCount;
    if(!changed)return false;
    syncDom({emitChange});
    notify();
    return true;
  }

  function bindDom(){
    for(const field of FIELDS){
      const id=FIELD_TO_ID[field];
      const el=$(id);
      if(!el)continue;
      const event=field==='detune'?'input':'change';
      el.addEventListener(event,()=>{
        if(syncing)return;
        readDom();
        notify();
      });
    }
  }

  function subscribe(fn){
    listeners.add(fn);
    fn({...state});
    return ()=>listeners.delete(fn);
  }

  function applyFromPreset(instrument){
    if(!instrument)return false;
    return set({
      voiceCount:instrument.voiceCount,
      unisonCount:instrument.unisonCount,
      mode:instrument.mode,
      detune:instrument.detune
    },{emitChange:true});
  }

  readDom();
  bindDom();

  return {
    get voiceCount(){return state.voiceCount},
    get unisonCount(){return state.unisonCount},
    get mode(){return state.mode},
    get detune(){return state.detune},
    getState:()=>({voiceCount:state.voiceCount,unisonCount:state.unisonCount,mode:state.mode,detune:state.detune}),
    set,
    subscribe,
    applyFromPreset,
    syncDetuneDisplay
  };
}