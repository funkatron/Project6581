import {setControlChecked} from './ui-control.js?v=__BUILD_ID__';

const FIELDS=['rootOn','gameOn','latchOn'];
const FIELD_TO_ID={rootOn:'arpOn',gameOn:'gameArpOn',latchOn:'arpLatch'};
const GEN_TO_FIELD={root:'rootOn',game:'gameOn',latch:'latchOn'};

export function createPerformanceArpState($){
  const listeners=new Set();
  let syncing=false;
  const state={rootOn:false,gameOn:false,latchOn:false};

  function readDom(){
    state.rootOn=Boolean($('arpOn')?.checked);
    state.gameOn=Boolean($('gameArpOn')?.checked);
    state.latchOn=Boolean($('arpLatch')?.checked);
  }

  function notify(){
    const snapshot={...state};
    for(const fn of listeners)fn(snapshot);
  }

  function syncDom({emitChange=true}={}){
    syncing=true;
    try{
      for(const field of FIELDS){
        setControlChecked($(FIELD_TO_ID[field]),state[field],{emitChange});
      }
    }finally{syncing=false}
  }

  function set(patch,{emitChange=true}={}){
    let changed=false;
    for(const field of FIELDS){
      if(patch[field]===undefined)continue;
      const next=Boolean(patch[field]);
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
        const next=Boolean($(id)?.checked);
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

  function applyFromPreset(performance,{emitChange=false}={}){
    if(!performance)return false;
    const patch={};
    const arp=performance.arp;
    const game=performance.game;
    if(arp&&arp.enabled!==undefined)patch.rootOn=arp.enabled;
    if(arp&&arp.latch!==undefined)patch.latchOn=arp.latch;
    if(game&&game.enabled!==undefined)patch.gameOn=game.enabled;
    return set(patch,{emitChange});
  }

  readDom();
  bindDom();

  return {
    get rootOn(){return state.rootOn},
    get gameOn(){return state.gameOn},
    get latchOn(){return state.latchOn},
    getState:()=>({...state}),
    set,
    subscribe,
    applyFromPreset,
    fieldForGenerator:gen=>GEN_TO_FIELD[gen]
  };
}