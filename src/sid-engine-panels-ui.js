import {mountPitchEnvelopeEditor} from './pitch-envelope-editor.js?v=__BUILD_ID__';
import {maxVoicesForEngines,requiredEnginePanels} from './sid-engines.js';

const FILTER_MODES=['lowpass','bandpass','highpass'];

export function mountSidEnginePanels({
 $,engines,getEngines,ranges,formatControlValue,onEngineChange,syncVoiceSelectOptions,getMeterLevels
}={}){
 if(!$||!engines)throw new TypeError('mountSidEnginePanels requires $ and engines');
 function visibleCount(){
  const manual=engines.filter(engine=>engine.enabled).length;
  const floor=requiredEnginePanels(Number($('voiceCount').value));
  return Math.max(manual,floor);
 }
 function renderRainbowMeter(level=0){
  const wrap=document.createElement('div');
  wrap.className='sid-rainbow-meter';
  wrap.setAttribute('role','img');
  wrap.setAttribute('aria-label','SID output level');
  const fill=document.createElement('div');
  fill.className='sid-rainbow-meter-fill';
  fill.style.height=(Math.max(0,Math.min(1,level))*100).toFixed(1)+'%';
  wrap.append(fill);
  return wrap;
 }
 function renderEngineCard(index){
  const engine=getEngines()[index];
  const card=document.createElement('article');
  card.className='sid-engine-card panel';
  card.dataset.engine=String(index);
  card.hidden=!engine.enabled;
  const header=document.createElement('header');
  header.className='sid-engine-header';
  const title=document.createElement('h3');
  title.textContent='SID '+(index+1);
  const meter=renderRainbowMeter(getMeterLevels?.()[index]??0);
  meter.dataset.chip=String(index);
  const modelLabel=document.createElement('label');
  modelLabel.textContent='Model ';
  const model=document.createElement('select');
  model.dataset.prop='model';
  model.setAttribute('aria-label','SID '+(index+1)+' chip model');
  for(const value of [6581,8580]){
   const option=document.createElement('option');
   option.value=String(value);
   option.textContent=value===6581?'MOS 6581':'MOS 8580';
   model.append(option);
  }
  model.value=String(engine.model);
  modelLabel.append(model);
  const remove=document.createElement('button');
  remove.type='button';remove.className='sid-engine-remove';remove.textContent='Remove';
  remove.hidden=visibleCount()<=requiredEnginePanels(Number($('voiceCount').value));
  header.append(title,meter,modelLabel,remove);
  const panRow=document.createElement('label');
  panRow.className='sid-engine-pan';
  panRow.innerHTML='Pan L <input type="range" data-prop="pan" min="-100" max="100" step="1"><output class="base-value"></output> R';
  panRow.querySelector('[data-prop="pan"]').value=String(engine.pan);
  panRow.querySelector('output').textContent=engine.pan===0?'Center':engine.pan<0?Math.abs(engine.pan)+'% L':engine.pan+'% R';
  const grid=document.createElement('div');
  grid.className='voice-grid';
  const filterFields=[
    ['volume','Volume',0,100,1],['cutoff','Cutoff',50,10000,1],['resonance','Resonance',0,100,1]
  ];
  for(const [key,label,min,max,step] of filterFields){
   const row=document.createElement('label');
   row.dataset.filter=key;
   row.innerHTML=label+' <input type="range" data-filter="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'"><output class="base-value"></output>';
   const input=row.querySelector('input');
   input.value=String(engine.filter[key]);
   row.querySelector('output').textContent=formatControlValue(key,engine.filter[key]);
   grid.append(row);
  }
  const modeLabel=document.createElement('label');
  modeLabel.textContent='Filter ';
  const mode=document.createElement('select');
  mode.dataset.filter='mode';
  for(const value of FILTER_MODES){
   const option=document.createElement('option');
   option.value=value;option.textContent=value==='lowpass'?'Low-pass':value==='bandpass'?'Band-pass':'High-pass';
   mode.append(option);
  }
  mode.value=engine.filter.mode;
  modeLabel.append(mode);
  grid.append(modeLabel);
  card.append(header,panRow,grid);
  const voiceHost=document.createElement('div');
  voiceHost.className='sid-engine-voice';
  voiceHost.dataset.engineVoice=String(index);
  card.append(voiceHost);
  const voiceSection=document.createElement('section');
  const s=engine.voice;
  voiceSection.innerHTML='<h4>Voice</h4><div class="voice-grid"><label>Enabled <input type="checkbox" data-prop="enabled"></label><label>Waveform <select data-prop="wave"><option value="triangle">Triangle</option><option value="sawtooth">Sawtooth</option><option value="square">Pulse</option><option value="noise">Noise</option></select></label>'+ranges.map(([p,name,min,max,step])=>'<label data-control="'+p+'">'+name+' <input data-prop="'+p+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+s[p]+'"><output class="base-value">'+formatControlValue(p,s[p])+'</output></label>').join('')+'</div>';
  voiceHost.append(voiceSection);
  voiceSection.querySelector('[data-prop="enabled"]').checked=s.enabled;
  voiceSection.querySelector('[data-prop="wave"]').value=s.wave;
  const updatePulse=()=>voiceSection.querySelectorAll('[data-control="pulse"],[data-control="pwmDepth"],[data-control="pwmRate"]').forEach(label=>{label.hidden=s.wave!=='square'});
  updatePulse();
  voiceSection.querySelectorAll('[data-prop]').forEach(inp=>inp.addEventListener('input',()=>{
   engine.voice[inp.dataset.prop]=inp.type==='checkbox'?inp.checked:inp.type==='range'?Number(inp.value):inp.value;
   const out=inp.closest('label')?.querySelector('output:not(.modulated-value)');
   if(out)out.textContent=formatControlValue(inp.dataset.prop,Number(inp.value));
   if(inp.dataset.prop==='wave')updatePulse();
   onEngineChange?.(index);
  }));
  card.querySelectorAll('[data-filter]').forEach(inp=>inp.addEventListener('input',()=>{
   const key=inp.dataset.filter;
   engine.filter[key]=key==='mode'?inp.value:Number(inp.value);
   const out=inp.closest('label')?.querySelector('output');
   if(out&&key!=='mode')out.textContent=formatControlValue(key,engine.filter[key]);
   onEngineChange?.(index);
  }));
  panRow.querySelector('[data-prop="pan"]').addEventListener('input',e=>{
   engine.pan=Number(e.target.value);
   const out=panRow.querySelector('output');
   if(engine.pan===0)out.textContent='Center';
   else if(engine.pan<0)out.textContent=Math.abs(engine.pan)+'% L';
   else out.textContent=engine.pan+'% R';
   onEngineChange?.(index);
  });
  model.addEventListener('change',()=>{engine.model=Number(model.value);onEngineChange?.(index,'model');});
  remove.addEventListener('click',()=>{engine.enabled=false;render();syncVoiceSelectOptions?.();onEngineChange?.(index,'remove');});
  mountPitchEnvelopeEditor(voiceHost,{
   getEnvelope:()=>engine.voice.pitchEnvelope,
   applyEnvelope:envelope=>{engine.voice.pitchEnvelope=envelope;onEngineChange?.(index);}
  });
  return card;
 }
 function render(){
  const root=$('sidEngines');
  if(!root)return;
  root.replaceChildren();
  const count=visibleCount();
  for(let index=0;index<count;index++){
   const engine=engines[index];
   engine.enabled=true;
   root.append(renderEngineCard(index));
  }
  for(let index=count;index<3;index++){
   const engine=engines[index];
   if(engine.enabled)root.append(renderEngineCard(index));
  }
  const add=$('sidEngineAdd');
  if(add)add.disabled=count>=3;
 }
 function updateMeters(levels){
  $('sidEngines')?.querySelectorAll('.sid-rainbow-meter-fill').forEach((fill,idx)=>{
   const level=levels?.[idx]??0;
   fill.style.height=(Math.max(0,Math.min(1,level))*100).toFixed(1)+'%';
  });
 }
 render();
 return {render,updateMeters,visibleCount};
}