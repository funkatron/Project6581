// Presentation-only helpers for continuously modulated UI range controls.
// MIDI/SID sound parameters must not be derived from a CSS position.
export const SLIDER_TARGETS = [
 'volume','cutoff','resonance','detune','attack','decay','sustain',
 'release','pulse','pwmDepth','pwmRate'
];

function clamp(value, min, max) {
 return Math.max(min, Math.min(max, value));
}

// Returns track percentages, never new slider values. The thumb stays at base.
export function modulationTrack(base, effective, min, max, active=false) {
 const lo=Number(min), hi=Number(max);
 if(!Number.isFinite(lo)||!Number.isFinite(hi)||hi<=lo)
  throw new RangeError('Invalid slider bounds');
 const value=Number(base), mod=Number(effective);
 if(!Number.isFinite(value)||!Number.isFinite(mod))
  throw new RangeError('Invalid slider value');
 const center=100*(clamp(value,lo,hi)-lo)/(hi-lo);
 const current=100*(clamp(mod,lo,hi)-lo)/(hi-lo);
 return {
  center: center+'%',
  start: Math.min(center,current)+'%',
  end: Math.max(center,current)+'%',
  active: Boolean(active)&&Math.abs(current-center)>1e-9
 };
}

export function formatControlValue(target,value) {
 const n=Number(value);
 if(!Number.isFinite(n))return '—';
 if(['attack','decay','release'].includes(target))return n.toFixed(2)+' s';
 if(target==='cutoff')return Math.round(n)+' Hz';
 if(target==='pwmRate')return n.toFixed(2)+' Hz';
 if(target==='sustain')return Math.round(n*100)+'%';
 if(target==='detune')return n.toFixed(1).replace(/\\.0$/,'')+'¢';
 if(['volume','resonance','pulse','pwmDepth'].includes(target))
  return Math.round(n)+'%';
 return String(n);
}
