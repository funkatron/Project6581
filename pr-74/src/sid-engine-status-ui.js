// Pure SID engine status copy and LED semantics for the header status bar.
export function sidLedState({hasAudio,contextState,starting}){
 if(hasAudio)return contextState==='running'?'on':'ready';
 if(starting)return 'loading';
 return 'off';
}

export function sidLedAriaLabel(state){
 if(state==='on')return 'SID engine on';
 if(state==='ready')return 'SID engine ready, audio suspended';
 if(state==='loading')return 'SID engine loading';
 return 'SID engine off';
}

export function formatSidProgressMessage(message,contextState){
 if(!message)return '';
 if(contextState==='suspended')return message+' Tap Enable audio to activate playback.';
 return message;
}

export function formatActiveSidStatus(contextState,model,{afterInit=false}={}){
 if(contextState==='running')return 'Authentic reSIDfp active · SID '+model+'.';
 if(contextState==='suspended'){
  if(afterInit)return 'SID ready · touch a key to unlock audio.';
  return 'SID ready · tap Enable audio to resume.';
 }
 return 'SID ready · touch a key to unlock audio.';
}

export function formatBrowserLatencyStatus(baseLatencySeconds,outputLatencySeconds){
 const parts=[];
 if(Number.isFinite(baseLatencySeconds))parts.push('base '+(baseLatencySeconds*1000).toFixed(1)+' ms');
 if(Number.isFinite(outputLatencySeconds))parts.push('output '+(outputLatencySeconds*1000).toFixed(1)+' ms');
 if(!parts.length)return 'Browser audio latency: not reported.';
 return 'Browser audio latency: '+parts.join(' / ')+' (not total key-to-sound latency)';
}

export function shouldShowSidUnlock({contextRetired,context}){
 if(contextRetired||!context)return false;
 if(context.state==='running'||context.state==='closed')return false;
 return true;
}
