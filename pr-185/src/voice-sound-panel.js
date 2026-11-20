import {mountPitchEnvelopeEditor} from './pitch-envelope-editor.js?v=0.18.12+20261120T183917605Z';
import {setLayoutInert} from './ui-layout.js?v=0.18.12+20261120T183917605Z';

export function mountVoiceSoundPanel({
 $,settings,ranges,formatControlValue,applyPitchEnvelope,onVoiceChange
}={}){
 if(!$||!settings)throw new TypeError('mountVoiceSoundPanel requires $ and settings');
 let pitchEnvelopeEditorUi=null;
 function renderVoiceControls(){
  const s=settings[0],el=document.createElement('section');
  el.className='panel';
  el.innerHTML='<h2>SID voice</h2><div class="voice-grid"><label>Enabled <input type="checkbox" data-prop="enabled"></label><label>Waveform <select data-prop="wave"><option value="triangle">Triangle</option><option value="sawtooth">Sawtooth</option><option value="square">Pulse</option><option value="noise">Noise</option></select></label>'+ranges.map(([p,name,min,max,step])=>'<label data-control="'+p+'">'+name+' <input data-prop="'+p+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+s[p]+'"><output class="base-value">'+formatControlValue(p,s[p])+'</output></label>').join('')+'</div>';
  $('voices').replaceChildren(el);
  el.querySelector('[data-prop="enabled"]').checked=s.enabled;
  el.querySelector('[data-prop="wave"]').value=s.wave;
  const updatePulse=()=>el.querySelectorAll('[data-control="pulse"],[data-control="pwmDepth"],[data-control="pwmRate"]').forEach(label=>{setLayoutInert(label,s.wave!=='square')});
  el.querySelectorAll('[data-prop]').forEach(inp=>inp.addEventListener('input',()=>{
   s[inp.dataset.prop]=inp.type==='checkbox'?inp.checked:inp.type==='range'?Number(inp.value):inp.value;
   const baseOutput=inp.closest('label')?.querySelector('output:not(.modulated-value)');
   if(baseOutput)baseOutput.textContent=formatControlValue(inp.dataset.prop,Number(inp.value));
   if(inp.dataset.prop==='wave')updatePulse();
   onVoiceChange?.();
  }));
  updatePulse();
  pitchEnvelopeEditorUi=mountPitchEnvelopeEditor($('voices'),{
   getEnvelope:()=>settings[0].pitchEnvelope,
   applyEnvelope:applyPitchEnvelope
  });
 }
 renderVoiceControls();
 return {renderVoiceControls,getPitchEnvelopeEditor:()=>pitchEnvelopeEditorUi};
}