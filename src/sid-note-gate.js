// Pure helpers for when musical input may sound. Keeps the instrument honest
// while the AudioContext is suspended or the SID engine is switching.

export function shouldBlockMusicalInput({
  pendingStartup=false,
  pendingClose=false,
  presetLoading=false,
  starting=false,
  cleanupBlocked=false
}={}){
  if(pendingStartup)return true;
  if(pendingClose)return true;
  if(presetLoading)return true;
  if(starting)return true;
  if(cleanupBlocked)return true;
  return false;
}

export function needsAudioResume(contextState){
  return contextState==='suspended'||contextState==='interrupted';
}

export function canDispatchNote({
  blocked=false,
  hasController=false,
  voiceEnabled=true,
  contextState=null,
  allowWhileSuspended=false
}={}){
  if(blocked)return {ok:false,reason:'engine busy'};
  if(!hasController)return {ok:false,reason:'engine unavailable'};
  if(!voiceEnabled)return {ok:false,reason:'voice disabled'};
  if(needsAudioResume(contextState)&&!allowWhileSuspended){
    return {ok:false,reason:'audio not running'};
  }
  return {ok:true,reason:null};
}
