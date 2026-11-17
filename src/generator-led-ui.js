import {bindHelpGesture} from './ui-help-gesture.js?v=__BUILD_ID__';

const RATE_LABEL={0.25:'1/1',0.5:'1/2',1:'1/4',2:'1/8',4:'1/16',8:'1/32',16:'1/64',32:'1/128'};
const HELP_BY_GEN={root:'generator-led-root',game:'generator-led-game',latch:'generator-led-latch'};
const CONTROL_BY_GEN={root:'arpOn',game:'gameArpOn',latch:'arpLatch'};
const LABEL_BY_GEN={root:'Root Arp',game:'Game Arp',latch:'Latch'};

export function mountGeneratorLeds($,{onGeneratorToggle}={}){
 const host=$('generatorLeds');
 if(!host)return;
 const specs=[
  {id:'genLedRoot',gen:'root',getOn:()=>$('arpOn')?.checked,getDetail:()=>RATE_LABEL[$('arpRate')?.value]??''},
  {id:'genLedGame',gen:'game',getOn:()=>$('gameArpOn')?.checked,getDetail:()=>RATE_LABEL[$('gameRate')?.value]??''},
  {id:'genLedLatch',gen:'latch',getOn:()=>$('arpLatch')?.checked,getDetail:()=>''}
 ];
 function toggleGen(gen){
  const input=$(CONTROL_BY_GEN[gen]);
  if(!input)return;
  input.checked=!input.checked;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  onGeneratorToggle?.(gen,input.checked);
 }
 host.replaceChildren();
 for(const spec of specs){
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
 function sync(){
  for(const spec of specs){
   const btn=$(spec.id);
   if(!btn)continue;
   const on=Boolean(spec.getOn?.());
   btn.dataset.state=on?'on':'off';
   btn.setAttribute('aria-pressed',String(on));
   const name=LABEL_BY_GEN[spec.gen]??spec.gen;
   btn.setAttribute('aria-label',name+(on?', on':', off')+'. Tap to toggle.');
   const detail=spec.getDetail?.();
   btn.querySelector('.gen-led-detail').textContent=detail&&on?' · '+detail:'';
  }
 }
 for(const id of ['arpOn','gameArpOn','arpLatch','arpRate','gameRate'])
  $(id)?.addEventListener('change',sync);
 sync();
 return {sync};
}
