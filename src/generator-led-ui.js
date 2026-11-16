import {bindHelpGesture} from './ui-help-gesture.js?v=__BUILD_ID__';

const RATE_LABEL={0.25:'1/1',0.5:'1/2',1:'1/4',2:'1/8',4:'1/16',8:'1/32',16:'1/64',32:'1/128'};
const HELP_BY_GEN={root:'generator-led-root',game:'generator-led-game',latch:'generator-led-latch'};

export function mountGeneratorLeds($,{focusPlaySection}={}){
 const host=$('generatorLeds');
 if(!host)return;
 const specs=[
  {id:'genLedRoot',gen:'root',scroll:'rootArpTitle',getOn:()=>$('arpOn')?.checked,getDetail:()=>RATE_LABEL[$('arpRate')?.value]??''},
  {id:'genLedGame',gen:'game',scroll:'gameArpTitle',getOn:()=>$('gameArpOn')?.checked,getDetail:()=>RATE_LABEL[$('gameRate')?.value]??''},
  {id:'genLedLatch',gen:'latch',scroll:'arpLatch',getOn:()=>$('arpLatch')?.checked,getDetail:()=>''}
 ];
 host.replaceChildren();
 for(const spec of specs){
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='gen-led';
  btn.id=spec.id;
  btn.dataset.gen=spec.gen;
  btn.dataset.state='off';
  btn.setAttribute('aria-label',spec.gen+' generator');
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
   onTap:()=>focusPlaySection?.(spec.scroll)
  });
  host.append(btn);
 }
 function sync(){
  for(const spec of specs){
   const btn=$(spec.id);
   if(!btn)continue;
   const on=Boolean(spec.getOn?.());
   btn.dataset.state=on?'on':'off';
   const detail=spec.getDetail?.();
   btn.querySelector('.gen-led-detail').textContent=detail&&on?' · '+detail:'';
  }
 }
 for(const id of ['arpOn','gameArpOn','arpLatch','arpRate','gameRate'])
  $(id)?.addEventListener('change',sync);
 sync();
 return {sync};
}
