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
 if(contextState==='running')return 'SID '+model+' active.';
 if(contextState==='suspended'){
  return afterInit?'SID ready · touch a key to unlock audio.':'SID ready · tap Enable audio to resume.';
 }
 return 'SID ready · touch a key to unlock audio.';
}

/** Footer: measured touch → output when available; otherwise browser-reported output path minimum. */
export function formatPlaybackLatencyStatus(
 {keyToOutputEstimateMs,keyEnergyMissed,baseMs,outputMs}={}
){
 if(Number.isFinite(keyToOutputEstimateMs)){
  const output=Number.isFinite(outputMs)?' (includes '+outputMs.toFixed(1)+' ms output buffer)':'';
  return 'Touch → output: '+keyToOutputEstimateMs.toFixed(1)+' ms'+output+'.';
 }
 if(keyEnergyMissed){
  return 'Touch → output: no loud PCM within 16 render blocks — try another key.';
 }
 const parts=[];
 if(Number.isFinite(baseMs))parts.push(baseMs.toFixed(1)+' ms base');
 if(Number.isFinite(outputMs))parts.push(outputMs.toFixed(1)+' ms output');
 if(parts.length){
  return 'Touch → output: tap a key to measure (browser output path: '+parts.join(' + ')+').';
 }
 return 'Touch → output: start audio, then tap a key to measure.';
}

export function formatBrowserLatencyStatus(baseLatencySeconds,outputLatencySeconds){
 const base=Number.isFinite(baseLatencySeconds)?baseLatencySeconds*1000:null;
 const output=Number.isFinite(outputLatencySeconds)?outputLatencySeconds*1000:null;
 return formatPlaybackLatencyStatus({baseMs:base,outputMs:output});
}

export function shouldShowSidUnlock({contextRetired,context}){
 if(contextRetired||!context)return false;
 if(context.state==='running'||context.state==='closed')return false;
 return true;
}
