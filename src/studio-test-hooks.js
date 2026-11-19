/** True when automation may call __project6581Test (query ?testHooks=1). */
export function testHooksEnabled(search=typeof location!=='undefined'?location.search:''){
 return new URLSearchParams(search).get('testHooks')==='1';
}

export function countDrumSourcesInTrace(snapshot,{type='note-on',prefix='drum:'}={}){
 if(!snapshot?.entries)return [];
 return snapshot.entries.filter(
  entry=>entry.type===type&&String(entry.source??'').startsWith(prefix),
 );
}

export function mountStudioTestHooks({
 studioTrace,
 getSidReady,
 validateDrumSequence,
 setDrumSequence,
 renderDrumPanel,
 drumStart,
 drumStop,
 getDrumRunning,
 setMasterBpm,
 panic,
}){
 return {
  ready:()=>Boolean(getSidReady()),
  loadDrumSequence:raw=>{
   const seq=validateDrumSequence(raw);
   setDrumSequence(seq);
   renderDrumPanel();
  },
  drumPreview:on=>{
   if(on)drumStart();
   else drumStop();
  },
  drumRunning:()=>Boolean(getDrumRunning()),
  setMasterBpm:bpm=>setMasterBpm(bpm),
  exportStudioTrace:()=>studioTrace.snapshot(),
  panic:()=>panic('test-hooks'),
  listDrumNoteOns:()=>countDrumSourcesInTrace(studioTrace.snapshot()),
 };
}