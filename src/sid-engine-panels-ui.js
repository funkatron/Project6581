import {mountPitchEnvelopeEditor} from './pitch-envelope-editor.js?v=__BUILD_ID__';
import {DRUM_ENGINE_INDEX,SID_ENGINE_COUNT,drumChipForBus,isDrumChip as chipIsDrum} from './sid-engines.js';
import {chipPanStereoPeaks,meterDisplayWidth} from './sid-meter-display.js?v=__BUILD_ID__';
import {formatPanBrief,formatHzBrief,formatPercent} from './control-format.js?v=__BUILD_ID__';
import {setLayoutInert} from './ui-layout.js?v=__BUILD_ID__';

const FILTER_MODES=['lowpass','bandpass','highpass'];

export function querySidEngineCard(chip){
 return document.querySelector('.sid-engine-card[data-engine="'+chip+'"]');
}

const DRUM_BUS_SID_LABELS=['Kick','Snare','Cymbals'];

export function mountSidEnginePanels({
 $,engines,getEngines,ranges,formatControlValue,onEngineChange,getMeterLevels,getDrumBusMeterLevels,
 getActiveDrumBusIndex,getDrumBusFilter,setDrumBusFilterField
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
 function renderStereoChipMeter(chipIndex,monoLevel,panPercent){
  const {left,right}=chipPanStereoPeaks(monoLevel,panPercent);
  const wrap=document.createElement('div');
  wrap.className='sid-stereo-meter sid-stereo-meter--stacked';
  wrap.dataset.chip=String(chipIndex);
  wrap.setAttribute('role','img');
  function channel(side,labelText,level){
   const channelEl=document.createElement('div');
   channelEl.className='sid-stereo-meter-channel';
   channelEl.dataset.channel=side;
   const label=document.createElement('span');
   label.className='sid-stereo-meter-label';
   label.textContent=labelText;
   const meter=renderRainbowMeter(level);
   meter.dataset.channel=side;
   channelEl.append(label,meter);
   return channelEl;
  }
  wrap.append(channel('left','L',left),channel('right','R',right));
  const lWidth=meterDisplayWidth(left);
  const rWidth=meterDisplayWidth(right);
  wrap.setAttribute('aria-label','Drum bus level L '+lWidth+' R '+rWidth);
  return wrap;
 }
 function applyMeterWidth(meterEl,level){
  const fill=meterEl?.querySelector('.sid-rainbow-meter-fill');
  if(!fill)return null;
  const width=meterDisplayWidth(level);
  fill.style.width=width;
  return width;
 }
 function drumBusFilterForCard(engine,busIndex){
  const resolved=busIndex??getActiveDrumBusIndex?.()??0;
  return getDrumBusFilter?.(resolved)??engine.filter;
 }
 function renderEngineCard(index,{drumBusIndex}={}){
  const engine=getEngines()[index];
  const isDrumChip=chipIsDrum(index);
  const fixedBusIndex=isDrumChip?index-DRUM_ENGINE_INDEX:null;
  const busIndexForCard=isDrumChip?fixedBusIndex:0;
  const drumBusFilter=isDrumChip?engine.filter:null;
   const card=document.createElement('article');
  card.className='sid-engine-card panel';
  card.dataset.engine=String(index);
  if(isDrumChip&&fixedBusIndex!==null)card.dataset.drumBus=String(fixedBusIndex);
  const header=document.createElement('header');
  header.className='sid-engine-header';
  const title=document.createElement('h3');
  if(isDrumChip){
   title.textContent='SID '+(index+1)+' · '+(DRUM_BUS_SID_LABELS[busIndexForCard]??'Drums');
  }else title.textContent='SID '+(index+1);
  let peakLevel=getMeterLevels?.()[index]??0;
  if(isDrumChip&&fixedBusIndex!==null){
   const busPeak=getDrumBusMeterLevels?.()?.[busIndexForCard];
   if(Number.isFinite(busPeak))peakLevel=busPeak;
  }
  const meter=isDrumChip
   ?renderStereoChipMeter(index,peakLevel,engine.pan)
   :(()=>{const mono=renderRainbowMeter(peakLevel);mono.dataset.chip=String(index);return mono;})();
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
  if(isDrumChip){
   const busHeading=document.createElement('h4');
   busHeading.className='control-span-full sid-engine-voice-heading';
   busHeading.textContent='Bus filter';
   controlGrid.append(busHeading);
  }
  const filterFields=[
   ['volume','Volume',0,100,formatPercent],
   ['cutoff','Cutoff',50,10000,formatHzBrief],
   ['resonance','Resonance',0,100,formatPercent]
  ];
  for(const [key,label,min,max,formatFn] of filterFields){
   const rowLabel=isDrumChip&&key==='cutoff'?'Bus cutoff':label;
   const filterRef=isDrumChip?drumBusFilter:engine.filter;
   appendParamRow(controlGrid,rowLabel,{value:filterRef[key],min,max,step:1,filter:key,formatFn:value=>formatFn(value)});
  }
  const modeLabel=document.createElement('label');
  modeLabel.className='control-span-full filter-mode';
  modeLabel.textContent=isDrumChip?'Bus filter mode ':'Filter ';
  const mode=document.createElement('select');
  mode.dataset.filter='mode';
  for(const value of FILTER_MODES){
   const option=document.createElement('option');
   option.value=value;option.textContent=value==='lowpass'?'Low-pass':value==='bandpass'?'Band-pass':'High-pass';
   mode.append(option);
  }
  mode.value=(isDrumChip?drumBusFilter:engine.filter).mode;
  modeLabel.append(mode);
  controlGrid.append(modeLabel);
  if(isDrumChip){
   const boostLabel=document.createElement('label');
   boostLabel.className='control-span-full';
   boostLabel.textContent='Boost ';
   const boostSelect=document.createElement('select');
   boostSelect.dataset.prop='outputBoostDb';
   for(const db of [0,6,12,18,24]){
    const option=document.createElement('option');
    option.value=String(db);
    option.textContent=db===0?'Off':('+'+db+' dB');
    boostSelect.append(option);
   }
   boostSelect.value=String(engine.outputBoostDb??18);
   boostSelect.setAttribute('aria-label','SID '+(index+1)+' output boost');
   boostLabel.append(boostSelect);
   controlGrid.append(boostLabel);
   boostSelect.addEventListener('change',()=>{
    engine.outputBoostDb=Number(boostSelect.value);
    onEngineChange?.(index,'boost');
   });
  }
  const s=engine.voice;
  if(isDrumChip){
   const enabledLabel=document.createElement('label');
   enabledLabel.className='control-span-full voice-toggle';
   const enabledInput=document.createElement('input');
   enabledInput.type='checkbox';
   enabledInput.dataset.prop='enabled';
   enabledInput.checked=s.enabled;
   enabledLabel.append((DRUM_BUS_SID_LABELS[busIndexForCard]??'Drum')+' output enabled ',enabledInput);
   controlGrid.append(enabledLabel);
   enabledInput.addEventListener('change',()=>{
    engine.voice.enabled=enabledInput.checked;
    onEngineChange?.(index);
   });
   const drumNote=document.createElement('p');
   drumNote.className='drum-chip-note control-span-full';
   drumNote.textContent='Pan, filter, model, and boost on this card control SID '+(index+1)+' only.';
   controlGrid.append(drumNote);
  }else{
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
   mountPitchEnvelopeEditor(voiceHost,{
    getEnvelope:()=>engine.voice.pitchEnvelope,
    applyEnvelope:envelope=>{engine.voice.pitchEnvelope=envelope;onEngineChange?.(index);}
   });
  }
  card.append(header,controlGrid);
  card.querySelectorAll('input[data-filter]').forEach(inp=>inp.addEventListener('input',()=>{
   const key=inp.dataset.filter;
   const value=Number(inp.value);
   if(isDrumChip&&setDrumBusFilterField){
    setDrumBusFilterField(busIndexForCard,key,value);
   }else engine.filter[key]=value;
   const filterRef=isDrumChip?drumBusFilterForCard(engine,busIndexForCard):engine.filter;
   const out=inp.closest('.param-row')?.querySelector('.param-values output');
   if(out){
    if(key==='cutoff')out.textContent=formatHzBrief(filterRef[key]);
    else if(key==='volume'||key==='resonance')out.textContent=formatPercent(filterRef[key]);
    else out.textContent=formatControlValue(key,filterRef[key]);
   }
   onEngineChange?.(index);
  }));
  card.querySelectorAll('select[data-filter]').forEach(inp=>inp.addEventListener('change',()=>{
   if(isDrumChip&&setDrumBusFilterField){
    setDrumBusFilterField(busIndexForCard,'mode',inp.value);
   }else engine.filter.mode=inp.value;
   onEngineChange?.(index);
  }));
  pan.input.addEventListener('input',e=>{
   engine.pan=Number(e.target.value);
   pan.output.textContent=formatPanBrief(engine.pan);
   onEngineChange?.(index);
  });
  model.addEventListener('change',()=>{engine.model=Number(model.value);onEngineChange?.(index,'model');});
  return card;
 }
 function drumEngineHostForBus(busIndex){
  return document.querySelector('.drum-bus-sid-engine[data-drum-bus="'+busIndex+'"]');
 }
 function render(){
  const melodic=$('sidEngines');
  melodic?.replaceChildren();
  for(let index=0;index<DRUM_ENGINE_INDEX;index++){
   melodic?.append(renderEngineCard(index));
  }
  renderDrumBusPanels();
 }
 function renderDrumBusPanels(){
  for(let bus=0;bus<DRUM_BUS_SID_LABELS.length;bus++){
   const host=drumEngineHostForBus(bus);
   if(!host)continue;
   host.replaceChildren(renderEngineCard(drumChipForBus(bus)));
  }
 }
 function updateMeters(levels,busLevels){
  const busMeterLevels=busLevels??getDrumBusMeterLevels?.();
  document.querySelectorAll('.sid-engine-card[data-drum-bus]').forEach(card=>{
   const chip=Number(card.dataset.engine);
   const bus=Number(card.dataset.drumBus);
   if(!Number.isInteger(chip)||!Number.isInteger(bus))return;
   const stereo=card.querySelector('.sid-stereo-meter');
   if(!stereo)return;
   const chipPeak=Number(levels?.[chip]);
   const busPeak=Number(busMeterLevels?.[bus]);
   let peak=0;
   if(Number.isFinite(chipPeak)&&chipPeak>0)peak=chipPeak;
   else if(Number.isFinite(busPeak))peak=busPeak;
   const pan=getEngines()[chip]?.pan??0;
   const {left,right}=chipPanStereoPeaks(peak,pan);
   applyMeterWidth(stereo.querySelector('[data-channel="left"] .sid-rainbow-meter'),left);
   applyMeterWidth(stereo.querySelector('[data-channel="right"] .sid-rainbow-meter'),right);
   const lWidth=meterDisplayWidth(left);
   const rWidth=meterDisplayWidth(right);
   stereo.setAttribute('aria-label','SID '+(chip+1)+' level L '+lWidth+' R '+rWidth);
  });
  document.querySelectorAll('.sid-engine-card .sid-rainbow-meter[data-chip]').forEach(meter=>{
   const chip=Number(meter.dataset.chip);
   if(!Number.isInteger(chip)||chip<0||chip>=SID_ENGINE_COUNT||chipIsDrum(chip))return;
   const width=applyMeterWidth(meter,levels?.[chip]);
   if(width)meter.setAttribute('aria-label','SID output level '+width);
  });
 }
 function renderDrumBus(){
  renderDrumBusPanels();
 }
 function refreshDrumBusControls(busIndex){
  const chip=drumChipForBus(busIndex);
  const card=document.querySelector('.sid-engine-card[data-engine="'+chip+'"][data-drum-bus="'+busIndex+'"]');
  if(!card)return;
  const engine=getEngines()[chip];
  const drumBusFilter=engine.filter;
  for(const inp of card.querySelectorAll('input[data-filter]')){
   const key=inp.dataset.filter;
   if(!key)continue;
   inp.value=String(drumBusFilter[key]);
   const out=inp.closest('.param-row')?.querySelector('.param-values output');
   if(!out)continue;
   if(key==='cutoff')out.textContent=formatHzBrief(drumBusFilter[key]);
   else if(key==='volume'||key==='resonance')out.textContent=formatPercent(drumBusFilter[key]);
  }
  const mode=card.querySelector('select[data-filter="mode"]');
  if(mode)mode.value=drumBusFilter.mode;
 }
 render();
 return {render,renderDrumBus,renderDrumBusPanels,refreshDrumBusControls,updateMeters};
}