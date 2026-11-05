// Conventional 12-tone equal-tempered scales; melodic minor uses the ascending form in both directions.
export const PITCH_NAMES=Object.freeze(['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']);
export const SCALES=Object.freeze([
 ['chromatic','Chromatic',[0,1,2,3,4,5,6,7,8,9,10,11]],
 ['major','Major',[0,2,4,5,7,9,11]],
 ['natural-minor','Natural Minor',[0,2,3,5,7,8,10]],
 ['harmonic-minor','Harmonic Minor',[0,2,3,5,7,8,11]],
 ['melodic-minor','Melodic Minor',[0,2,3,5,7,9,11]],
 ['ionian','Ionian',[0,2,4,5,7,9,11]],
 ['dorian','Dorian',[0,2,3,5,7,9,10]],
 ['phrygian','Phrygian',[0,1,3,5,7,8,10]],
 ['lydian','Lydian',[0,2,4,6,7,9,11]],
 ['mixolydian','Mixolydian',[0,2,4,5,7,9,10]],
 ['aeolian','Aeolian',[0,2,3,5,7,8,10]],
 ['locrian','Locrian',[0,1,3,5,6,8,10]],
 ['major-pentatonic','Major Pentatonic',[0,2,4,7,9]],
 ['minor-pentatonic','Minor Pentatonic',[0,3,5,7,10]],
 ['blues','Blues',[0,3,5,6,7,10]]
].map(([id,label,steps])=>Object.freeze({id,label,steps:Object.freeze(steps)})));
const LOOKUP=new Map(SCALES.map(scale=>[scale.id,scale.steps]));
export function validScaleId(id){return LOOKUP.has(id)}
export function inScale(note,key=0,id='chromatic'){
 const steps=LOOKUP.get(id);
 if(!steps||!Number.isInteger(key)||key<0||key>11||!Number.isInteger(note))throw new RangeError('Invalid scale, key or note');
 return steps.includes(((note-key)%12+12)%12);
}
export function quantizePitch(note,key=0,id='chromatic',locked=false){
 if(!Number.isFinite(note))throw new RangeError('Invalid note');
 const pitch=Math.max(0,Math.min(127,Math.round(note)));
 if(!locked||id==='chromatic')return pitch;
 if(inScale(pitch,key,id))return pitch;
 // Tie breaks downward. Search both directions within the full MIDI range.
 for(let distance=1;distance<=127;distance++){
  const lower=pitch-distance,upper=pitch+distance;
  if(lower>=0&&inScale(lower,key,id))return lower;
  if(upper<=127&&inScale(upper,key,id))return upper;
 }
 return pitch;
}
