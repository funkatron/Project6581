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

const DRUM_LANE_INDEX={
 kick:0,sn:1,ch:2,oh:3,clap:4,tom:5,
};

export function setDrumGridCell(sequence,laneId,stepIndex,on){
 if(!sequence?.grid)throw new TypeError('Drum sequence must include grid');
 const rowIndex=DRUM_LANE_INDEX[laneId];
 if(rowIndex===undefined)throw new RangeError('Unknown drum lane: '+laneId);
 if(!Number.isInteger(stepIndex)||stepIndex<0)throw new RangeError('stepIndex must be a non-negative integer');
 const steps=sequence.grid[rowIndex]?.length??0;
 if(stepIndex>=steps)throw new RangeError('stepIndex out of range');
 const nextGrid=sequence.grid.map((row,ri)=>
  ri===rowIndex?row.map((cell,ci)=>(ci===stepIndex?Boolean(on):cell)):[...row],
 );
 return {...sequence,grid:nextGrid};
}

export function mountStudioTestHooks({
 studioTrace,
 getSidReady,
 validateDrumSequence,
 getDrumSequence,
 setDrumSequence,
 renderDrumPanel,
 triggerDrumLane,
 drumStart,
 drumStop,
 getDrumRunning,
 setMasterBpm,
 capturePcmWav,
 panic,
}){
 return {
  ready:()=>Boolean(getSidReady()),
  getDrumSequence:()=>{
   const seq=getDrumSequence?.();
   return seq?structuredClone(seq):null;
  },
  loadDrumSequence:raw=>{
   const seq=validateDrumSequence(raw);
   setDrumSequence(seq);
   renderDrumPanel();
  },
  setDrumCell:(laneId,stepIndex,on,{audition=false}={})=>{
   const base=getDrumSequence?.()??validateDrumSequence({});
   const seq=setDrumGridCell(base,laneId,stepIndex,on);
   setDrumSequence(validateDrumSequence(seq));
   renderDrumPanel();
   if(audition&&on)triggerDrumLane?.(laneId);
  },
  auditionDrumLane:laneId=>{triggerDrumLane?.(laneId)},
  drumPreview:on=>{
   if(on)drumStart();
   else drumStop();
  },
  drumRunning:()=>Boolean(getDrumRunning()),
  setMasterBpm:bpm=>setMasterBpm(bpm),
  capturePcmWav:async durationMs=>{
   if(typeof capturePcmWav!=='function')throw new Error('PCM capture is not available');
   return capturePcmWav(durationMs);
  },
  exportStudioTrace:()=>studioTrace.snapshot(),
  panic:()=>panic('test-hooks'),
  listDrumNoteOns:()=>countDrumSourcesInTrace(studioTrace.snapshot()),
 };
}