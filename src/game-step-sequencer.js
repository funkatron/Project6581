// One editable, sixteen-step Game Arp phrase. No browser or SID dependencies.
export const STEP_LENGTHS=Object.freeze([4,8,16]);
export const DEFAULT_STEPS=Object.freeze(
 [0,4,7,12,7,4,0,-5,0,3,7,10,7,3,0,-2].map((offset,i)=>
  Object.freeze({offset,gate:![3,7,11].includes(i),duration:75}))
);
export function defaultSequence(){
 return {length:16,steps:DEFAULT_STEPS.map(step=>({...step}))};
}
export function validateSequence(sequence){
 if(!sequence||typeof sequence!=='object'||Array.isArray(sequence))throw new TypeError('Sequence must be an object');
 if(!STEP_LENGTHS.includes(sequence.length))throw new RangeError('Sequence length must be 4, 8 or 16');
 if(!Array.isArray(sequence.steps)||sequence.steps.length!==16)throw new RangeError('Sequence requires sixteen steps');
 return {
  length:sequence.length,
  steps:sequence.steps.map((step,i)=>{
   if(!step||typeof step!=='object'||Array.isArray(step))throw new TypeError('Step '+(i+1)+' must be an object');
   if(!Number.isInteger(step.offset)||step.offset< -12||step.offset>24)
    throw new RangeError('Step '+(i+1)+' pitch must be -12 to +24 semitones');
   if(typeof step.gate!=='boolean')throw new TypeError('Step '+(i+1)+' gate must be true or false');
   if(!Number.isInteger(step.duration)||step.duration<25||step.duration>100)
    throw new RangeError('Step '+(i+1)+' duration must be 25–100 percent');
   return {offset:step.offset,gate:step.gate,duration:step.duration};
  })
 };
}
export function sequenceEvent(root,sequence,position){
 if(!Number.isFinite(root)||!Number.isInteger(position)||position<0)throw new RangeError('Invalid root or step');
 // Phrases are validated when loaded or saved. Avoid revalidating and
 // allocating sixteen new step objects on every browser-timed note tick.
 if(!sequence||!STEP_LENGTHS.includes(sequence.length)||!Array.isArray(sequence.steps)||sequence.steps.length!==16)
  throw new RangeError('Invalid active sequence');
 const index=position%sequence.length,step=sequence.steps[index];
 return {index,gate:step.gate,note:Math.max(0,Math.min(127,Math.round(root+step.offset))),duration:step.duration};
}
