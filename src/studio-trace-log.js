// Always-on, local-only ring buffer for studio lifecycle events (allocation, panic, presets).
// Separate from the opt-in note/register event log in sid-event-log.js.
export function createStudioTraceLog({capacity=256,now=()=>performance.now()}={}){
 if(!Number.isInteger(capacity)||capacity<1)throw new RangeError('Invalid trace capacity');
 const entries=new Array(capacity);
 let count=0,cursor=0,overwritten=0;
 const add=(type,details={})=>{
  entries[cursor]={type,atMs:now(),...details};
  cursor=(cursor+1)%capacity;
  if(count<capacity)count++;else overwritten++;
 };
 return {
  add,
  clear(){entries.fill(undefined);count=0;cursor=0;overwritten=0},
  snapshot(){return {capacity,overwritten,entries:Array.from({length:count},(_,i)=>entries[(cursor-count+i+capacity)%capacity])}}
 };
}

function formatTraceDetail(details){
 const skip=new Set(['type','atMs']);
 const parts=[];
 for(const [key,value] of Object.entries(details)){
  if(skip.has(key))continue;
  if(value==null)continue;
  if(typeof value==='object')parts.push(key+'='+JSON.stringify(value));
  else parts.push(key+'='+String(value));
 }
 return parts.join(' · ');
}

export function formatStudioTraceText(snapshot,{headerLines=[]}={}){
 const lines=[...headerLines];
 if(snapshot.overwritten)lines.push('('+snapshot.overwritten+' earlier trace lines dropped)');
 for(const entry of snapshot.entries){
  const ms=Number.isFinite(entry.atMs)?entry.atMs.toFixed(1):'?';
  const detail=formatTraceDetail(entry);
  lines.push(ms+' ms · '+entry.type+(detail?': '+detail:''));
 }
 if(!snapshot.entries.length)lines.push('No studio trace lines yet.');
 return lines.join('\n');
}

export function formatStudioTraceReport(snapshot,environment){
 return JSON.stringify({schemaVersion:1,kind:'studio-trace',
  notice:'Always-on local studio trace. Does not include opt-in note events unless copied via the full diagnostic bundle.',
  environment,trace:snapshot},null,2);
}