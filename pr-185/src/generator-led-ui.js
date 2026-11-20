import {bindHelpGesture} from './ui-help-gesture.js?v=0.18.12+20261120T183708550Z';

const RATE_LABEL={0.25:'1/1',0.5:'1/2',1:'1/4',2:'1/8',4:'1/16',8:'1/32',16:'1/64',32:'1/128'};
const HELP_BY_GEN={drum:'generator-led-drum',root:'generator-led-root',game:'generator-led-game',latch:'generator-led-latch'};
const LABEL_BY_GEN={drum:'Drum seq',root:'Root Arp',game:'Game Arp',latch:'Latch'};

export function mountGeneratorLeds($,{performanceArp,performanceDrum,toggleDrumTransport,onGeneratorToggle}={}){
 const host=$('generatorLeds');
 if(!host||!performanceArp)return;
 const arpSpecs=[
  {id:'genLedRoot',gen:'root',getDetail:()=>RATE_LABEL[$('arpRate')?.value]??''},
  {id:'genLedGame',gen:'game',getDetail:()=>RATE_LABEL[$('gameRate')?.value]??''},
  {id:'genLedLatch',gen:'latch',getDetail:()=>''}
 ];
 function toggleGen(gen){
  const field=performanceArp.fieldForGenerator(gen);
  if(!field)return;
  const next=!performanceArp[field];
  if(performanceArp.set({[field]:next}))onGeneratorToggle?.(gen,next);
 }
 host.replaceChildren();
 if(performanceDrum){
  const drumBtn=document.createElement('button');
  drumBtn.type='button';
  drumBtn.className='gen-led gen-led-drum';
  drumBtn.id='genLedDrum';
  drumBtn.dataset.gen='drum';
  drumBtn.dataset.state='off';
  drumBtn.setAttribute('aria-pressed','false');
  const dot=document.createElement('span');
  dot.className='gen-led-dot';
  dot.setAttribute('aria-hidden','true');
  const label=document.createElement('span');
  label.className='gen-led-label';
  label.textContent='DRUM';
  const detail=document.createElement('span');
  detail.className='gen-led-detail';
  drumBtn.append(dot,label,detail);
  bindHelpGesture(drumBtn,{
   helpId:HELP_BY_GEN.drum,
   onTap:()=>toggleDrumTransport?.()
  });
  host.append(drumBtn);
 }
 for(const spec of arpSpecs){
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='gen-led';
  btn.id=spec.id;
  btn.dataset.gen=spec.gen;
  btn.dataset.state='off';
  btn.setAttribute('aria-pressed','false');
  const dot=document.createElement('span');
  dot.className='gen-led-dot';
  dot.setAttribute('aria-hidden','true');
  const label=document.createElement('span');
  label.className='gen-led-label';
  label.textContent=spec.gen.toUpperCase();
  const detail=document.createElement('span');
  detail.className='gen-led-detail';
  btn.append(dot,label,detail);
  bindHelpGesture(btn,{
   helpId:HELP_BY_GEN[spec.gen],
   onTap:()=>toggleGen(spec.gen)
  });
  host.append(btn);
 }
 function syncDrum(snapshot){
  if(!performanceDrum)return;
  const btn=$('genLedDrum');
  if(!btn)return;
  const on=Boolean(snapshot?.drumOn);
  btn.dataset.state=on?'on':'off';
  btn.setAttribute('aria-pressed',String(on));
  const rate=RATE_LABEL[$('drumRate')?.value]??'';
  btn.setAttribute('aria-label','Drum seq'+(on?', running':', stopped')+'. Tap to toggle.');
  btn.querySelector('.gen-led-detail').textContent=on&&rate?' · '+rate:'';
 }
 function syncArp(snapshot){
  const state=snapshot??performanceArp.getState();
  for(const spec of arpSpecs){
   const btn=$(spec.id);
   if(!btn)continue;
   const field=performanceArp.fieldForGenerator(spec.gen);
   const on=Boolean(state[field]);
   btn.dataset.state=on?'on':'off';
   btn.setAttribute('aria-pressed',String(on));
   const name=LABEL_BY_GEN[spec.gen]??spec.gen;
   btn.setAttribute('aria-label',name+(on?', on':', off')+'. Tap to toggle.');
   const detail=spec.getDetail?.();
   btn.querySelector('.gen-led-detail').textContent=detail&&on?' · '+detail:'';
  }
 }
 for(const id of ['arpRate','gameRate','drumRate'])$(id)?.addEventListener('change',()=>{syncArp();syncDrum({drumOn:performanceDrum?.drumOn})});
 performanceArp.subscribe(syncArp);
 performanceDrum?.subscribe(syncDrum);
 return {syncArp,syncDrum};
}