/** SID 4 oscillator slots: 0=kick bus, 1=snare bus, 2=hat bus (CH xor OH). */
export const DRUM_SLOT = Object.freeze({kick:0,sn:1,hat:2});

function byLane(hits){
 const map=new Map();
 for(const hit of hits)map.set(hit.lane,hit);
 return map;
}

/** Which closed/open hat wins when both are scheduled on one step (CH priority). */
export function chooseHatLane(lanes){
 if(lanes.has('ch'))return 'ch';
 if(lanes.has('oh'))return 'oh';
 return null;
}

/**
 * Map grid hits on one step to lanes that may trigger, with fixed SID4 slots.
 * Kick and snare always keep their slots; CH and OH are mutually exclusive on the hat bus.
 */
export function resolveDrumHitsOnStep(hits){
 if(!hits?.length)return [];
 const lanes=byLane(hits);
 const out=[];
 if(lanes.has('kick'))out.push({...lanes.get('kick'),slot:DRUM_SLOT.kick});
 if(lanes.has('sn'))out.push({...lanes.get('sn'),slot:DRUM_SLOT.sn});
 const hatLane=chooseHatLane(lanes);
 if(hatLane)out.push({...lanes.get(hatLane),slot:DRUM_SLOT.hat});
 return out;
}

/** Single-lane preview (grid tap): default slot when not using full-step policy. */
export function defaultDrumSlotForLane(laneId){
 if(laneId==='kick')return DRUM_SLOT.kick;
 if(laneId==='sn')return DRUM_SLOT.sn;
 if(laneId==='ch'||laneId==='oh')return DRUM_SLOT.hat;
 return DRUM_SLOT.kick;
}

export function isDrumSlotIndex(value){
 return Number.isInteger(value)&&value>=0&&value<=2;
}