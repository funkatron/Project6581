import {DEFAULT_PITCH_ENVELOPE} from './pitch-envelope.js';

// Temporary sound-design controls. Deliberately excluded from preset serialization.
export function envelopeFromAuditionState({enabled=false,start=12,duration=120}={}){
 if(!enabled)return {...DEFAULT_PITCH_ENVELOPE,enabled:false};
 return {
  enabled:true,
  interpolation:'linear',
  end:'hold',
  points:[{ms:0,semitones:start},{ms:duration,semitones:0}]
 };
}
export function createPitchAuditionUi({onEnvelopeChange=()=>{}}={}){
 const state={enabled:false,start:12,duration:120};
 const envelope=()=>envelopeFromAuditionState(state);
 const notify=()=>onEnvelopeChange(state.enabled?envelope():{...DEFAULT_PITCH_ENVELOPE,enabled:false});
 const mount=parent=>{
  const host=document.createElement('fieldset');
  host.className='pitch-audition';
  host.innerHTML='<legend>Pitch sweep · audition</legend>'+
   '<label>Enable sweep <input type="checkbox" data-pitch-audition="enabled"></label>'+
   '<label>Starting pitch (semitones) <input type="range" min="-24" max="24" step="1" data-pitch-audition="start"><output></output></label>'+
   '<label>Sweep duration (ms) <input type="range" min="10" max="1000" step="10" data-pitch-audition="duration"><output></output></label>'+
   '<small>Applies to newly played notes. Audition only: not saved with presets.</small>';
  const controls=host.querySelectorAll('[data-pitch-audition]');
  for(const input of controls){
   const key=input.dataset.pitchAudition;
   input[input.type==='checkbox'?'checked':'value']=state[key];
   const refresh=()=>{
    state[key]=input.type==='checkbox'?input.checked:Number(input.value);
    const output=input.closest('label').querySelector('output');
    if(output)output.textContent=String(state[key])+(key==='duration'?' ms':' st');
    notify();
   };
   input.addEventListener('input',refresh);
   const output=input.closest('label').querySelector('output');
   if(output)output.textContent=String(state[key])+(key==='duration'?' ms':' st');
  }
  parent.append(host);
 };
 const currentEnvelope=()=>envelopeFromAuditionState(state);
 return {mount,currentEnvelope,notify};
}
