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

export function formatSidDiagnosticReport(log,environment){
 return JSON.stringify({schemaVersion:1,
  notice:'Local diagnostic log. Times are main-thread receipt/dispatch times, not physical speaker latency. Audio frame positions use a separate clock. Several notes may share one rendered block; this does not prove each note was audible.',
  environment,...log.snapshot()},null,2);
}
