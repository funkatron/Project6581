export const LFO_WAVES = ['sine', 'triangle', 'sawtooth', 'square', 'sample-hold'];
export const LFO_TARGETS = {volume:[0,100],cutoff:[50,10000],resonance:[0,100],detune:[0,100],attack:[0,2],decay:[0,3],sustain:[0,1],release:[0.01,4],pulse:[5,95],pwmDepth:[0,45],pwmRate:[0.1,12]};
export function lfoValue(wave,phase,seed=0){
 const p=phase-Math.floor(phase);
 if(wave==='sine')return Math.sin(2*Math.PI*p);
 if(wave==='triangle')return 1-4*Math.abs(p-0.5);
 if(wave==='sawtooth')return 2*p-1;
 if(wave==='square')return p<0.5?1:-1;
 if(wave==='sample-hold'){const n=Math.sin((Math.floor(phase)+seed+1)*127.1)*43758.5453;return 2*(n-Math.floor(n))-1;}
 throw new RangeError('Unknown LFO waveform');
}
// Add all modulation contributions before clamping. Never mutate base slider values.
export function modulate(base,lfos,time,{pulseActive=true}={}){
 const result={...base},offsets={};
 for(const lfo of lfos){
  if(!lfo.enabled||!lfo.depth||!Object.hasOwn(LFO_TARGETS,lfo.target))continue;
  if(!pulseActive&&['pulse','pwmDepth','pwmRate'].includes(lfo.target))continue;
  const [min,max]=LFO_TARGETS[lfo.target];
  const depth=Math.max(0,Math.min(1,lfo.depth));
  const offset=lfoValue(lfo.wave,(lfo.phase??0)+time*lfo.rate,lfo.seed??0)*depth*(max-min)/2;
  offsets[lfo.target]=(offsets[lfo.target]??0)+offset;
 }
 for(const [target,offset] of Object.entries(offsets)){
  const [min,max]=LFO_TARGETS[target];
  result[target]=Math.max(min,Math.min(max,Number(base[target]??min)+offset));
 }
 return result;
}
