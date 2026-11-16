// Opt-in, local-only ring buffer. No timestamps or event allocation while disabled.
export function createSidEventLog({capacity=512,now=()=>performance.now()}={}){
 if(!Number.isInteger(capacity)||capacity<1)throw new RangeError('Invalid log capacity');
 const entries=new Array(capacity);
 let enabled=false,nextId=0,count=0,cursor=0,overwritten=0;
 const add=(type,details={})=>{
  if(!enabled)return;
  entries[cursor]={...details,type,atMs:now()};
  cursor=(cursor+1)%capacity;
  if(count<capacity)count++;else overwritten++;
 };
 return {
  get enabled(){return enabled},
  setEnabled(value){enabled=Boolean(value)},
  begin(type,details){if(!enabled)return null;const eventId=++nextId;add(type,{...details,eventId});return eventId},
  add,
  clear(){entries.fill(undefined);count=0;cursor=0;overwritten=0},
  snapshot(){return {enabled,capacity,overwritten,entries:Array.from({length:count},(_,i)=>entries[(cursor-count+i+capacity)%capacity])}}
 };
}

function formatEventDetail(entry){
 const skip=new Set(['type','atMs','eventId']);
 const parts=[];
 for(const [key,value] of Object.entries(entry)){
  if(skip.has(key))continue;
  if(value==null)continue;
  if(Array.isArray(value))parts.push(key+'=['+value.join(',')+']');
  else if(typeof value==='object')parts.push(key+'='+JSON.stringify(value));
  else parts.push(key+'='+String(value));
 }
 return parts.join(' · ');
}

export function formatSidEventLogText(snapshot,{headerLines=[],newestFirst=true}={}){
 const lines=[...headerLines];
 if(!snapshot.enabled)lines.push('Detailed note logging is off. Open Diagnostics to enable, or check “Log note events”.');
 else if(snapshot.overwritten)lines.push('('+snapshot.overwritten+' earlier note events dropped)');
 const entries=newestFirst?[...snapshot.entries].reverse():snapshot.entries;
 for(const entry of entries){
  if(!entry)continue;
  const ms=Number.isFinite(entry.atMs)?entry.atMs.toFixed(1):'?';
  const detail=formatEventDetail(entry);
  const id=Number.isInteger(entry.eventId)?' #'+entry.eventId:'';
  lines.push(ms+' ms · '+entry.type+id+(detail?': '+detail:''));
 }
 if(snapshot.enabled&&!entries.length)lines.push('No detailed note events yet. Play a key or run an arp.');
 return lines.join('\n');
}

export function formatSidDiagnosticReport(log,environment){
 return JSON.stringify({schemaVersion:1,
  notice:'Local diagnostic log. Times are main-thread receipt/dispatch times, not physical speaker latency. Audio frame positions use a separate clock. Several notes may share one rendered block; this does not prove each note was audible.',
  environment,...log.snapshot()},null,2);
}
