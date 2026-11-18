/** 12-TET Western scales for keyboard display and optional performance lock. */

export const SCALE_IDS=Object.freeze([
 'chromatic','major','natural-minor','harmonic-minor','melodic-minor',
 'dorian','phrygian','lydian','mixolydian','locrian',
 'major-pentatonic','minor-pentatonic','blues'
]);

export const TONIC_NAMES=Object.freeze(['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']);

const INTERVALS={
 chromatic:[0,1,2,3,4,5,6,7,8,9,10,11],
 major:[0,2,4,5,7,9,11],
 'natural-minor':[0,2,3,5,7,8,10],
 'harmonic-minor':[0,2,3,5,7,8,11],
 'melodic-minor':[0,2,3,5,7,9,11],
 dorian:[0,2,3,5,7,9,10],
 phrygian:[0,1,3,5,7,8,10],
 lydian:[0,2,4,6,7,9,11],
 mixolydian:[0,2,4,5,7,9,10],
 locrian:[0,1,3,5,6,8,10],
 'major-pentatonic':[0,2,4,7,9],
 'minor-pentatonic':[0,3,5,7,10],
 blues:[0,3,5,6,7,10]
};

export function scaleIntervals(scaleId){
 if(!SCALE_IDS.includes(scaleId))throw new RangeError('Invalid scale');
 return INTERVALS[scaleId];
}

export function normalizeScaleState(raw){
 const tonic=Number(raw?.tonic);
 const id=typeof raw?.id==='string'?raw.id:'chromatic';
 const lock=Boolean(raw?.lock);
 return {
  tonic:Number.isInteger(tonic)&&tonic>=0&&tonic<=11?tonic:0,
  id:SCALE_IDS.includes(id)?id:'chromatic',
  lock
 };
}

export function pitchClass(midi){
 return ((midi%12)+12)%12;
}

export function scalePitchClasses(tonic,scaleId){
 if(scaleId==='chromatic')return new Set(INTERVALS.chromatic);
 const classes=new Set();
 for(const step of INTERVALS[scaleId])classes.add((tonic+step)%12);
 return classes;
}

export function isPitchInScale(midi,{tonic,id}){
 if(id==='chromatic')return true;
 return scalePitchClasses(tonic,id).has(pitchClass(midi));
}

/** Nearest scale tone; equal distance → lower MIDI (deterministic). No-op when lock off or chromatic. */
export function quantizeToScale(midi,{tonic,id,lock}){
 const state=normalizeScaleState({tonic,id,lock});
 if(!state.lock||state.id==='chromatic')return midi;
 if(isPitchInScale(midi,state))return midi;
 const allowed=scalePitchClasses(state.tonic,state.id);
 let best=null;
 for(let d=1;d<=127;d++){
  const lower=midi-d, higher=midi+d;
  if(lower>=0&&allowed.has(pitchClass(lower))){
   best=lower;
   break;
  }
  if(higher<=127&&allowed.has(pitchClass(higher))){
   best=higher;
   break;
  }
 }
 return best??midi;
}

export function resolvePerformanceNote(midi,state){
 const clamped=Math.max(0,Math.min(127,Math.trunc(midi)));
 return quantizeToScale(clamped,normalizeScaleState(state));
}

/** Count held physical MIDI notes that resolve to the same performance pitch. */
export function countHeldResolvingTo(heldNotes,resolveNote,resolvedMidi){
 let count=0;
 for(const physical of heldNotes){
  if(resolveNote(physical)===resolvedMidi)count++;
 }
 return count;
}

export function readScaleStateFromDom($){
 if(!$('scaleKey'))return normalizeScaleState({});
 return normalizeScaleState({
  tonic:Number($('scaleKey').value),
  id:$('scaleId').value,
  lock:Boolean($('scaleLock')?.checked)
 });
}

export function validateScaleSettings(scale){
 const s=scale??{};
 return normalizeScaleState({
  tonic:Number(s.tonic),
  id:s.id,
  lock:s.lock
 });
}