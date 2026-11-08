import {
 DEFAULT_PITCH_ENVELOPE,
 MAX_PITCH_POINTS,
 validatePitchEnvelope
} from './pitch-envelope.js';

export const PITCH_EDITOR_MAX_POINTS=4;

export function pitchEnvelopeTemplates(){
 return {
  off:validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE),
  kick:validatePitchEnvelope({
   enabled:true,interpolation:'curve',end:'hold',
   points:[{ms:0,semitones:0},{ms:25,semitones:-18},{ms:140,semitones:-6}]
  }),
  tom:validatePitchEnvelope({
   enabled:true,interpolation:'linear',end:'hold',
   points:[{ms:0,semitones:0},{ms:35,semitones:-14},{ms:220,semitones:-4}]
  }),
  laser:validatePitchEnvelope({
   enabled:true,interpolation:'linear',end:'zero',
   points:[{ms:0,semitones:-8},{ms:60,semitones:18},{ms:180,semitones:0}]
  })
 };
}

export function pitchEnvelopesEqual(a,b){
 return JSON.stringify(a)===JSON.stringify(b);
}

export function detectPitchTemplate(envelope,templates=pitchEnvelopeTemplates()){
 if(!envelope.enabled)return 'off';
 for(const id of ['kick','tom','laser']){
  if(pitchEnvelopesEqual(envelope,templates[id]))return id;
 }
 return 'custom';
}

function draftFromEnvelope(envelope){
 return {
  enabled:envelope.enabled,
  interpolation:envelope.interpolation,
  end:envelope.end,
  points:envelope.points.map(point=>({ms:point.ms,semitones:point.semitones}))
 };
}

export function mountPitchEnvelopeEditor(parent,{getEnvelope,applyEnvelope,maxPoints=PITCH_EDITOR_MAX_POINTS}={}){
 if(!parent||typeof getEnvelope!=='function'||typeof applyEnvelope!=='function')
  throw new TypeError('Pitch envelope editor requires parent, getEnvelope, and applyEnvelope');
 const templates=pitchEnvelopeTemplates();
 const host=document.createElement('fieldset');
 host.className='pitch-envelope-editor';
 host.innerHTML=
  '<legend>Pitch envelope</legend>'+
  '<label class="pitch-template">Shape <select data-pitch-template aria-label="Pitch envelope shape">'+
   '<option value="off">Off</option><option value="kick">Kick drop</option><option value="tom">Tom fall</option>'+
   '<option value="laser">Laser rise</option><option value="custom">Custom</option></select></label>'+
  '<div class="pitch-custom" data-pitch-custom hidden>'+
   '<div class="pitch-custom-row"><label>Interpolation <select data-pitch-interp><option value="linear">Linear</option>'+
    '<option value="curve">Curve</option></select></label>'+
   '<label>After last point <select data-pitch-end><option value="hold">Hold</option><option value="zero">Return to 0 st</option></select></label></div>'+
   '<div class="pitch-point-list" data-pitch-points role="group" aria-label="Pitch envelope breakpoints"></div>'+
   '<div class="pitch-point-actions"><button type="button" data-pitch-add>Add point</button></div>'+
  '</div>'+
  '<small class="pitch-envelope-hint">Saved with presets (v4). Applies to newly played notes.</small>';
 parent.append(host);
 const templateSelect=host.querySelector('[data-pitch-template]');
 const customPanel=host.querySelector('[data-pitch-custom]');
 const interpSelect=host.querySelector('[data-pitch-interp]');
 const endSelect=host.querySelector('[data-pitch-end]');
 const pointList=host.querySelector('[data-pitch-points]');
 const addButton=host.querySelector('[data-pitch-add]');
 let draft=draftFromEnvelope(getEnvelope());
 let applying=false;

 function tryApply(){
  if(applying)return;
  try{
   const next=validatePitchEnvelope(draft);
   applying=true;
   applyEnvelope(next);
   draft=draftFromEnvelope(next);
  }catch{
   /* ignore transient invalid drafts while editing */
  }finally{
   applying=false;
  }
  paint();
 }

 function removePoint(index){
  if(draft.points.length<=1)return;
  draft.points.splice(index,1);
  draft.points[0].ms=0;
  tryApply();
 }

 function addPoint(){
  if(draft.points.length>=Math.min(maxPoints,MAX_PITCH_POINTS))return;
  const last=draft.points[draft.points.length-1];
  const ms=Math.min(10000,last.ms+40);
  draft.points.push({ms,semitones:last.semitones});
  tryApply();
 }

 function buildPointRow(point,index,total){
  const row=document.createElement('div');
  row.className='pitch-point-row';
  const msId='pitch-ms-'+index;
  const stId='pitch-st-'+index;
  row.innerHTML=
   '<label for="'+msId+'">Time (ms) <input id="'+msId+'" type="number" min="0" max="10000" step="1" data-pitch-ms value="'+point.ms+'"'+
    (index===0?' readonly aria-readonly="true"':'')+'></label>'+
   '<label for="'+stId+'">Pitch (st) <input id="'+stId+'" type="number" min="-48" max="48" step="1" data-pitch-st value="'+point.semitones+'"></label>';
  if(total>1&&index>0){
   const remove=document.createElement('button');
   remove.type='button';
   remove.className='pitch-point-remove';
   remove.textContent='Remove';
   remove.setAttribute('aria-label','Remove breakpoint '+(index+1));
   remove.addEventListener('click',()=>removePoint(index));
   row.append(remove);
  }
  const msInput=row.querySelector('[data-pitch-ms]');
  const stInput=row.querySelector('[data-pitch-st]');
  const onInput=()=>{
   point.ms=index===0?0:Number(msInput.value);
   point.semitones=Number(stInput.value);
   draft.points[0].ms=0;
   templateSelect.value='custom';
   tryApply();
  };
  msInput.addEventListener('input',onInput);
  stInput.addEventListener('change',onInput);
  msInput.addEventListener('change',onInput);
  stInput.addEventListener('input',onInput);
  return row;
 }

 function paintPoints(){
  pointList.replaceChildren(...draft.points.map((point,index)=>buildPointRow(point,index,draft.points.length)));
  addButton.disabled=!draft.enabled||draft.points.length>=Math.min(maxPoints,MAX_PITCH_POINTS);
 }

 function paint(){
  if(applying)return;
  const env=getEnvelope();
  draft=draftFromEnvelope(env);
  const templateId=detectPitchTemplate(env,templates);
  templateSelect.value=templateId;
  customPanel.hidden=!draft.enabled;
  interpSelect.value=draft.interpolation;
  endSelect.value=draft.end;
  paintPoints();
 }

 templateSelect.addEventListener('change',()=>{
  const choice=templateSelect.value;
  if(choice==='off'){
   draft=draftFromEnvelope(templates.off);
   tryApply();
   return;
  }
  if(choice==='custom'){
   if(!draft.enabled){
    draft=validatePitchEnvelope({
     enabled:true,interpolation:'linear',end:'hold',
     points:[{ms:0,semitones:12},{ms:120,semitones:0}]
    });
    draft=draftFromEnvelope(draft);
   }
   paintPoints();
   tryApply();
   return;
  }
  draft=draftFromEnvelope(templates[choice]);
  tryApply();
 });

 interpSelect.addEventListener('change',()=>{
  draft.interpolation=interpSelect.value;
  templateSelect.value='custom';
  tryApply();
 });
 endSelect.addEventListener('change',()=>{
  draft.end=endSelect.value;
  templateSelect.value='custom';
  tryApply();
 });
 addButton.addEventListener('click',()=>{
  templateSelect.value='custom';
  addPoint();
 });

 paint();
 return {refresh:paint};
}
