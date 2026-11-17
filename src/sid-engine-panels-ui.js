import {mountPitchEnvelopeEditor} from './pitch-envelope-editor.js?v=__BUILD_ID__';
import {SID_ENGINE_COUNT} from './sid-engines.js';
import {meterDisplayWidth} from './sid-meter-display.js?v=__BUILD_ID__';
import {formatPanBrief,formatHzBrief,formatPercent} from './control-format.js?v=__BUILD_ID__';
import {setLayoutInert} from './ui-layout.js?v=__BUILD_ID__';

const FILTER_MODES=['lowpass','bandpass','highpass'];

export function mountSidEnginePanels({
 $,engines,getEngines,ranges,formatControlValue,onEngineChange,getMeterLevels
}={}){
 if(!$||!engines)throw new TypeError('mountSidEnginePanels requires $ and engines');
 function renderRainbowMeter(level=0){
  const wrap=document.createElement('div');
  wrap.className='sid-rainbow-meter';
  wrap.setAttribute('role','img');
  const width=meterDisplayWidth(level);
  wrap.setAttribute('aria-label','SID output level '+width);
  const track=document.createElement('div');
  track.className='sid-rainbow-meter-track';
  track.setAttribute('aria-hidden','true');
  const fill=document.createElement('div');
  fill.className='sid-rainbow-meter-fill';
  fill.style.width=width;
  wrap.append(track,fill);
  return wrap;
 }
 function renderEngineCard(index){
  const engine=getEngines()[index];
  const card=document.createElement('article');
  card.className='sid-engine-card panel';
  card.dataset.engine=String(index);
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
  header.append(title,meter,modelLabel);
  function appendParamRow(parent,labelText,{value,min,max,step,filter,prop,formatFn}){
   const row=document.createElement('div');
   row.className='param-row';
   const label=document.createElement('span');
   label.className='param-label';
   label.textContent=labelText;
   const track=document.createElement('div');
   track.className='param-track';
   const input=document.createElement('input');
   input.type='range';
   input.min=String(min);
   input.max=String(max);
   input.step=String(step);
   input.value=String(value);
   if(filter)input.dataset.filter=filter;
   if(prop)input.dataset.prop=prop;
   const values=document.createElement('div');
   values.className='param-values';
   const output=document.createElement('output');
   output.className='param-value base-value';
   output.textContent=formatFn(value);
   values.append(output);
   track.append(input);
   row.append(label,track,values);
   parent.append(row);
   return {row,input,output,values};
  }
  const controlGrid=document.createElement('div');
  controlGrid.className='sid-engine-control-grid';
  const pan=appendParamRow(controlGrid,'Pan',{value:engine.pan,min:-100,max:100,step:1,prop:'pan',formatFn:formatPanBrief});
  const filterFields=[
    ['volume','Volume',0,100,formatPercent],
    ['cutoff','Cutoff',50,10000,formatHzBrief],
    ['resonance','Resonance',0,100,formatPercent]
  ];
  const filterRows=[];
  for(const [key,label,min,max,formatFn] of filterFields){
   filterRows.push(appendParamRow(controlGrid,label,{value:engine.filter[key],min,max,step:1,filter:key,formatFn:value=>formatFn(value)}));
  }
  const modeLabel=document.createElement('label');
  modeLabel.className='control-span-full filter-mode';
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
  controlGrid.append(modeLabel);
  const s=engine.voice;
  const voiceHeading=document.createElement('h4');
  voiceHeading.className='control-span-full sid-engine-voice-heading';
  voiceHeading.textContent='Voice';
  const voiceToggles=document.createElement('div');
  voiceToggles.className='control-span-full voice-toggles';
  const enabledLabel=document.createElement('label');
  enabledLabel.className='voice-toggle';
  const enabledInput=document.createElement('input');
  enabledInput.type='checkbox';
  enabledInput.dataset.prop='enabled';
  enabledInput.checked=s.enabled;
  enabledLabel.append('Enabled ',enabledInput);
  const waveLabel=document.createElement('label');
  waveLabel.className='voice-toggle';
  const waveSelect=document.createElement('select');
  waveSelect.dataset.prop='wave';
  for(const [value,label] of [['triangle','Triangle'],['sawtooth','Sawtooth'],['square','Pulse'],['noise','Noise']]){
   const option=document.createElement('option');
   option.value=value;option.textContent=label;
   waveSelect.append(option);
  }
  waveSelect.value=s.wave;
  waveLabel.append('Waveform ',waveSelect);
  voiceToggles.append(enabledLabel,waveLabel);
  const voiceHost=document.createElement('div');
  voiceHost.className='control-span-full sid-engine-voice';
  voiceHost.dataset.engineVoice=String(index);
  controlGrid.append(voiceHeading,voiceToggles);
  const voiceRows={};
  for(const [prop,name,min,max,step] of ranges){
   const row=appendParamRow(controlGrid,name,{
    value:s[prop],min,max,step,prop,formatFn:value=>formatControlValue(prop,value)
   });
   row.row.dataset.control=prop;
   voiceRows[prop]=row;
  }
  controlGrid.append(voiceHost);
  card.append(header,controlGrid);
  const updatePulse=()=>{
   const show=engine.voice.wave==='square';
   for(const key of ['pulse','pwmDepth','pwmRate']){
    const row=voiceRows[key]?.row;
    if(row)setLayoutInert(row,!show);
   }
  };
  updatePulse();
  controlGrid.querySelectorAll('[data-prop]').forEach(inp=>inp.addEventListener('input',()=>{
   engine.voice[inp.dataset.prop]=inp.type==='checkbox'?inp.checked:inp.type==='range'?Number(inp.value):inp.value;
   const out=inp.closest('.param-row')?.querySelector('.param-values output:not(.modulated-value)')
    ??inp.closest('label')?.querySelector('output:not(.modulated-value)');
   if(out&&inp.type==='range')out.textContent=formatControlValue(inp.dataset.prop,Number(inp.value));
   if(inp.dataset.prop==='wave')updatePulse();
   onEngineChange?.(index);
  }));
  waveSelect.addEventListener('change',()=>{
   engine.voice.wave=waveSelect.value;
   updatePulse();
   onEngineChange?.(index);
  });
  card.querySelectorAll('input[data-filter]').forEach(inp=>inp.addEventListener('input',()=>{
   const key=inp.dataset.filter;
   engine.filter[key]=Number(inp.value);
   const out=inp.closest('.param-row')?.querySelector('.param-values output');
   if(out){
    if(key==='cutoff')out.textContent=formatHzBrief(engine.filter[key]);
    else if(key==='volume'||key==='resonance')out.textContent=formatPercent(engine.filter[key]);
    else out.textContent=formatControlValue(key,engine.filter[key]);
   }
   onEngineChange?.(index);
  }));
  card.querySelectorAll('select[data-filter]').forEach(inp=>inp.addEventListener('change',()=>{
   engine.filter.mode=inp.value;
   onEngineChange?.(index);
  }));
  pan.input.addEventListener('input',e=>{
   engine.pan=Number(e.target.value);
   pan.output.textContent=formatPanBrief(engine.pan);
   onEngineChange?.(index);
  });
  model.addEventListener('change',()=>{engine.model=Number(model.value);onEngineChange?.(index,'model');});
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
  for(let index=0;index<SID_ENGINE_COUNT;index++){
   root.append(renderEngineCard(index));
  }
 }
 function updateMeters(levels){
  $('sidEngines')?.querySelectorAll('.sid-rainbow-meter').forEach(meter=>{
   const chip=Number(meter.dataset.chip);
   if(!Number.isInteger(chip)||chip<0||chip>2)return;
   const fill=meter.querySelector('.sid-rainbow-meter-fill');
   if(!fill)return;
   const width=meterDisplayWidth(levels?.[chip]);
   fill.style.width=width;
   meter.setAttribute('aria-label','SID output level '+width);
  });
 }
 render();
 return {render,updateMeters};
}