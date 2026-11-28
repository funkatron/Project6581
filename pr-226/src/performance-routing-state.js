import {DEFAULT_ROUTING,ROUTE_OPTIONS} from './sid-engines.js?v=0.30.0+20261128T010628315Z';
import {setControlValue} from './ui-control.js?v=0.30.0+20261128T010628315Z';

const FIELDS=['keyboard','arp','game'];
const FIELD_TO_ID={keyboard:'keyboardRoute',arp:'arpRoute',game:'gameRoute'};

function pickRoute(value,fallback){
  return ROUTE_OPTIONS.includes(value)?value:fallback;
}

export function createPerformanceRoutingState($,{onChange}={}){
  const listeners=new Set();
  let syncing=false;
  const state={keyboard:DEFAULT_ROUTING.keyboard,arp:DEFAULT_ROUTING.arp,game:DEFAULT_ROUTING.game};

  function readDom(){
    state.keyboard=pickRoute($('keyboardRoute')?.value,state.keyboard);
    state.arp=pickRoute($('arpRoute')?.value,state.arp);
    state.game=pickRoute($('gameRoute')?.value,state.game);
  }

  function notify(){
    const snapshot={...state};
    for(const fn of listeners)fn(snapshot);
    onChange?.(snapshot);
  }

  function syncDom({emitChange=true}={}){
    syncing=true;
    try{
      for(const field of FIELDS){
        setControlValue($(FIELD_TO_ID[field]),state[field],{emitChange});
      }
    }finally{syncing=false}
  }

  function set(patch,{emitChange=true}={}){
    let changed=false;
    for(const field of FIELDS){
      if(patch[field]===undefined)continue;
      const next=pickRoute(String(patch[field]),state[field]);
      if(state[field]!==next){
        state[field]=next;
        changed=true;
      }
    }
    if(!changed)return false;
    syncDom({emitChange});
    notify();
    return true;
  }

  function bindDom(){
    for(const field of FIELDS){
      const id=FIELD_TO_ID[field];
      $(id)?.addEventListener('change',()=>{
        if(syncing)return;
        const next=pickRoute($(id)?.value,state[field]);
        if(state[field]===next)return;
        state[field]=next;
        notify();
      });
    }
  }

  function subscribe(fn){
    listeners.add(fn);
    fn({...state});
    return ()=>listeners.delete(fn);
  }

  function applyFromPreset(performance){
    if(!performance?.routing)return false;
    return set(performance.routing,{emitChange:true});
  }

  readDom();
  bindDom();

  return {
    get keyboard(){return state.keyboard},
    get arp(){return state.arp},
    get game(){return state.game},
    getState:()=>({...state}),
    set,
    subscribe,
    applyFromPreset
  };
}