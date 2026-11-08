// Pure pitch-envelope geometry. No audio-thread scheduling or preset schema changes here.
// Times are milliseconds since note-on; offsets are semitones from the played note.
export const MAX_PITCH_POINTS = 16;
export function validatePitchEnvelope(envelope) {
 if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope))
  throw new TypeError('Pitch envelope must be an object');
 if (typeof envelope.enabled !== 'boolean') throw new TypeError('Pitch envelope enabled must be boolean');
 if (!['linear','curve'].includes(envelope.interpolation)) throw new RangeError('Invalid pitch interpolation');
 if (!['hold','zero'].includes(envelope.end)) throw new RangeError('Invalid pitch envelope end');
 if (!Array.isArray(envelope.points) || envelope.points.length < 1 || envelope.points.length > MAX_PITCH_POINTS)
  throw new RangeError('Pitch envelope needs 1–16 points');
 let previous=-1;
 const points=envelope.points.map((point,index)=>{
  if (!point || typeof point !== 'object' || Array.isArray(point)) throw new TypeError('Invalid pitch point');
  const {ms,semitones}=point;
  if (!Number.isFinite(ms) || ms<0 || ms>10000 || ms<=previous || (index===0 && ms!==0))
   throw new RangeError('Pitch point times must start at zero and strictly increase within 10 seconds');
  if (!Number.isFinite(semitones) || Math.abs(semitones)>48)
   throw new RangeError('Pitch offsets must be within ±48 semitones');
  previous=ms;
  return {ms,semitones};
 });
 return {enabled:envelope.enabled,interpolation:envelope.interpolation,end:envelope.end,points};
}
export function pitchOffsetAt(envelope,elapsedMs) {
 if (!envelope.enabled) return 0;
 if (!Number.isFinite(elapsedMs)) throw new RangeError('Invalid pitch envelope time');
 const points=envelope.points;
 if (elapsedMs<=0) return points[0].semitones;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if(elapsedMs<=b.ms){
   const t=(elapsedMs-a.ms)/(b.ms-a.ms);
   const eased=envelope.interpolation==='curve'?t*t*(3-2*t):t;
   return a.semitones+(b.semitones-a.semitones)*eased;
  }
 }
 return envelope.end==='zero'?0:points[points.length-1].semitones;
}
export const DEFAULT_PITCH_ENVELOPE=Object.freeze({
 enabled:false,interpolation:'linear',end:'zero',points:Object.freeze([Object.freeze({ms:0,semitones:0})])
});
export function simplePitchEnvelope(enabled,start,duration){
 if(!enabled)return validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE);
 return validatePitchEnvelope({
  enabled:true,interpolation:'linear',end:'hold',
  points:[{ms:0,semitones:start},{ms:duration,semitones:0}]
 });
}
