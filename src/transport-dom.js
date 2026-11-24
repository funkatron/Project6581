// Keeps transport-state.js in step with the tempo and rate controls.
// Mount this before any module that restarts clocks from these controls' events:
// listeners on one element run in registration order, so the state is current
// by the time a restart reads it.

const CONTROLS=[
 ['masterBpm','value',(patch,v)=>{patch.masterBpm=v}],
 ['arpPattern','value',(patch,v)=>{(patch.arp??={}).pattern=v}],
 ['arpRate','value',(patch,v)=>{(patch.arp??={}).rate=v}],
 ['arpSync','checked',(patch,v)=>{(patch.arp??={}).sync=v}],
 ['arpBpm','value',(patch,v)=>{(patch.arp??={}).localBpm=v}],
 ['gameRate','value',(patch,v)=>{(patch.game??={}).rate=v}],
 ['drumRate','value',(patch,v)=>{(patch.drum??={}).rate=v}],
 ['drumSync','checked',(patch,v)=>{(patch.drum??={}).sync=v}],
 ['drumBpm','value',(patch,v)=>{(patch.drum??={}).localBpm=v}]
];
export const TRANSPORT_CONTROL_IDS=Object.freeze(CONTROLS.map(([id])=>id));

export function readTransportPatchFromDom($){
 const patch={};
 for(const [id,prop,assign] of CONTROLS){
  const el=$(id);
  if(el)assign(patch,el[prop]);
 }
 return patch;
}

export function bindTransportDom($,transport){
 const readDom=()=>transport.set(readTransportPatchFromDom($));
 for(const id of TRANSPORT_CONTROL_IDS){
  const el=$(id);
  if(!el)continue;
  el.addEventListener('input',readDom);
  el.addEventListener('change',readDom);
 }
 readDom();
 // Call after code writes these controls without dispatching events (preset load).
 return {readDom};
}
