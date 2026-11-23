import {
 DEFAULT_PITCH_ENVELOPE,
 MAX_PITCH_POINTS,
 pitchOffsetAt,
 validatePitchEnvelope
} from './pitch-envelope.js';
import {
 pitchGraphAxes,
 pointToGraph,
 graphToPoint,
 clampDraggedPoint,
 proposePitchPoint
} from './pitch-envelope-graph.js';

export const PITCH_EDITOR_MAX_POINTS=4;
const GRAPH_SAMPLES=64;
const HANDLE_INSET=22;

export function pitchEnvelopeTemplates(){
 return {
  off:validatePitchEnvelope(DEFAULT_PITCH_ENVELOPE),
  kick:validatePitchEnvelope({
   enabled:true,interpolation:'curve',end:'hold',
   points:[{ms:0,semitones:0},{ms:28,semitones:-22},{ms:160,semitones:-8}]
  }),
  tom:validatePitchEnvelope({
   enabled:true,interpolation:'linear',end:'hold',
   points:[{ms:0,semitones:0},{ms:35,semitones:-14},{ms:220,semitones:-4}]
  }),
  laser:validatePitchEnvelope({
   enabled:true,interpolation:'linear',end:'zero',
   points:[{ms:0,semitones:-8},{ms:60,semitones:18},{ms:180,semitones:0}]
  }),
  snare:validatePitchEnvelope({
   enabled:true,interpolation:'linear',end:'zero',
   points:[{ms:0,semitones:5},{ms:40,semitones:-7},{ms:110,semitones:-14}]
  }),
  clap:validatePitchEnvelope({
   enabled:true,interpolation:'linear',end:'zero',
   points:[{ms:0,semitones:-3},{ms:28,semitones:9},{ms:95,semitones:0}]
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
   '<div class="pitch-graph-frame" data-pitch-graph role="group" aria-label="Pitch envelope breakpoints">'+
    '<svg class="pitch-graph" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Pitch envelope graph">'+
     '<line class="pitch-zero" data-pitch-zero></line>'+
     '<polyline class="pitch-curve" data-pitch-curve></polyline>'+
    '</svg>'+
   '</div>'+
   '<div class="pitch-inspector" data-pitch-inspector>'+
    '<label>Time (ms) <input type="number" min="0" max="10000" step="1" data-pitch-ms aria-label="Selected breakpoint time"></label>'+
    '<label>Pitch (st) <input type="number" min="-48" max="48" step="1" data-pitch-st aria-label="Selected breakpoint pitch"></label>'+
    '<button type="button" class="pitch-point-remove" data-pitch-remove>Remove</button>'+
   '</div>'+
  '</div>'+
  '<button type="button" class="help-trigger" data-help="pitch-envelope" aria-label="Help: pitch envelope">?</button>';
 parent.append(host);
 const templateSelect=host.querySelector('[data-pitch-template]');
 const customPanel=host.querySelector('[data-pitch-custom]');
 const interpSelect=host.querySelector('[data-pitch-interp]');
 const endSelect=host.querySelector('[data-pitch-end]');
 const frame=host.querySelector('[data-pitch-graph]');
 const zeroLine=host.querySelector('[data-pitch-zero]');
 const curve=host.querySelector('[data-pitch-curve]');
 const msInput=host.querySelector('[data-pitch-ms]');
 const stInput=host.querySelector('[data-pitch-st]');
 const removeButton=host.querySelector('[data-pitch-remove]');
 let draft=draftFromEnvelope(getEnvelope());
 let applying=false;
 let selected=0;
 let dragIndex=-1;

 function pointLimit(){
  return Math.min(maxPoints,MAX_PITCH_POINTS);
 }

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
  if(index<=0||draft.points.length<=1)return;
  draft.points.splice(index,1);
  draft.points[0].ms=0;
  if(selected>index)selected-=1;
  else if(selected===index)selected=index-1;
  templateSelect.value='custom';
  tryApply();
 }

 function selectEditablePoint(){
  if(draft.points.length>1)selected=1;
  else selected=0;
 }

 function localGraphPoint(event){
  const rect=frame.getBoundingClientRect();
  return {
   x:event.clientX-rect.left-HANDLE_INSET,
   y:event.clientY-rect.top-HANDLE_INSET,
   width:rect.width-HANDLE_INSET*2,
   height:rect.height-HANDLE_INSET*2
  };
 }

 function paintCurve(envelope){
  const axes=pitchGraphAxes(envelope.points);
  const zero=pointToGraph({ms:0,semitones:0},axes,100,100);
  zeroLine.setAttribute('x1','0');
  zeroLine.setAttribute('x2','100');
  zeroLine.setAttribute('y1',String(zero.y));
  zeroLine.setAttribute('y2',String(zero.y));
  const parts=[];
  for(let i=0;i<GRAPH_SAMPLES;i++){
   const ms=axes.timeMax*(i/(GRAPH_SAMPLES-1));
   const semitones=pitchOffsetAt(envelope,ms);
   const placed=pointToGraph({ms,semitones},axes,100,100);
   parts.push(placed.x+','+placed.y);
  }
  curve.setAttribute('points',parts.join(' '));
  frame.querySelectorAll('.pitch-handle').forEach(node=>node.remove());
  const handles=envelope.points.map((point,index)=>{
   const placed=pointToGraph(point,axes,100,100);
   const button=document.createElement('button');
   button.type='button';
   button.className='pitch-handle';
   if(index===selected)button.classList.add('is-selected');
   button.dataset.index=String(index);
   const across=placed.x/100;
   const down=placed.y/100;
   button.style.left='calc('+HANDLE_INSET+'px + '+across+' * (100% - '+(HANDLE_INSET*2)+'px))';
   button.style.top='calc('+HANDLE_INSET+'px + '+down+' * (100% - '+(HANDLE_INSET*2)+'px))';
   button.setAttribute('aria-label','Breakpoint '+(index+1)+', '+point.ms+' ms, '+point.semitones+' semitones');
   if(index===selected)button.setAttribute('aria-pressed','true');
   else button.setAttribute('aria-pressed','false');
   return button;
  });
  frame.append(...handles);
 }

 function paintInspector(){
  const point=draft.points[selected];
  const timeLocked=selected===0;
  msInput.readOnly=timeLocked;
  if(timeLocked)msInput.setAttribute('aria-readonly','true');
  else msInput.removeAttribute('aria-readonly');
  if(document.activeElement!==msInput)msInput.value=String(point.ms);
  if(document.activeElement!==stInput)stInput.value=String(point.semitones);
  removeButton.disabled=selected<=0||draft.points.length<=1;
 }

 function paint(){
  if(applying)return;
  const env=getEnvelope();
  draft=draftFromEnvelope(env);
  if(selected>=draft.points.length)selected=draft.points.length-1;
  if(selected<0)selected=0;
  templateSelect.value=detectPitchTemplate(env,templates);
  customPanel.hidden=!draft.enabled;
  interpSelect.value=draft.interpolation;
  endSelect.value=draft.end;
  if(draft.enabled)paintCurve(env);
  else{
   frame.querySelectorAll('.pitch-handle').forEach(node=>node.remove());
   curve.removeAttribute('points');
  }
  paintInspector();
 }

 templateSelect.addEventListener('change',()=>{
  const choice=templateSelect.value;
  if(choice==='off'){
   draft=draftFromEnvelope(templates.off);
   selected=0;
   tryApply();
   return;
  }
  if(choice==='custom'){
   if(!draft.enabled){
    draft=draftFromEnvelope(validatePitchEnvelope({
     enabled:true,interpolation:'linear',end:'hold',
     points:[{ms:0,semitones:12},{ms:120,semitones:0}]
    }));
   }
   selectEditablePoint();
   tryApply();
   return;
  }
  draft=draftFromEnvelope(templates[choice]);
  selectEditablePoint();
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

 function onInspectorInput(){
  const point=draft.points[selected];
  if(!point)return;
  if(selected===0)point.ms=0;
  else point.ms=Number(msInput.value);
  point.semitones=Number(stInput.value);
  draft.points[0].ms=0;
  templateSelect.value='custom';
  tryApply();
 }
 msInput.addEventListener('input',onInspectorInput);
 stInput.addEventListener('input',onInspectorInput);
 msInput.addEventListener('change',onInspectorInput);
 stInput.addEventListener('change',onInspectorInput);
 removeButton.addEventListener('click',()=>removePoint(selected));

 frame.addEventListener('pointerdown',event=>{
  const local=localGraphPoint(event);
  if(local.width<=0||local.height<=0)return;
  frame.setPointerCapture(event.pointerId);
  const handle=event.target.closest('.pitch-handle');
  if(handle){
   selected=Number(handle.dataset.index);
   dragIndex=selected;
   paint();
   return;
  }
  const axes=pitchGraphAxes(draft.points);
  const proposed=proposePitchPoint(local.x,local.y,draft.points,axes,local.width,local.height,pointLimit());
  if(!proposed){
   dragIndex=-1;
   return;
  }
  draft.points.splice(proposed.index,0,proposed.point);
  selected=proposed.index;
  dragIndex=selected;
  templateSelect.value='custom';
  tryApply();
 });
 frame.addEventListener('pointermove',event=>{
  if(dragIndex<0)return;
  const local=localGraphPoint(event);
  if(local.width<=0||local.height<=0)return;
  const axes=pitchGraphAxes(draft.points);
  const raw=graphToPoint(local.x,local.y,axes,local.width,local.height);
  const clamped=clampDraggedPoint(dragIndex,raw.ms,raw.semitones,draft.points);
  let ms=clamped.ms;
  if(dragIndex===0)ms=0;
  else ms=Math.round(clamped.ms);
  const rounded=clampDraggedPoint(dragIndex,ms,Math.round(clamped.semitones),draft.points);
  draft.points[dragIndex]={ms:rounded.ms,semitones:rounded.semitones};
  templateSelect.value='custom';
  tryApply();
 });
 function endDrag(){dragIndex=-1}
 frame.addEventListener('pointerup',endDrag);
 frame.addEventListener('pointercancel',endDrag);

 paint();
 return {refresh:paint};
}
