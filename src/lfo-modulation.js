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
