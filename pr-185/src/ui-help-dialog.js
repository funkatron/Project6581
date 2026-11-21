import {HELP_CONTENT} from './ui-help-content.js?v=0.21.7+20261121T183501991Z';

let lastFocus=null;

export function openHelp(helpId,{leadIn=null,$=id=>document.getElementById(id)}={}){
 const dialog=$('studioHelp');
 const entry=HELP_CONTENT[helpId];
 if(!dialog||!entry)return;
 lastFocus=document.activeElement;
 $('studioHelpTitle').textContent=entry.title;
 const body=$('studioHelpBody');
 body.replaceChildren();
 const list=document.createElement('ul');
 for(const line of entry.bullets){
  const li=document.createElement('li');
  li.textContent=line;
  list.append(li);
 }
 body.append(list);
 const lead=$('studioHelpLead');
 if(leadIn){lead.textContent=leadIn;lead.hidden=false}
 else{lead.hidden=true;lead.textContent=''}
 const go=$('studioHelpGo');
 if(entry.focusId){
  go.hidden=false;
  go.onclick=()=>{
   dialog.close('go');
   if(entry.relatedTab==='play')$('tabPlay')?.click();
   else if(entry.relatedTab==='voice')$('tabVoice')?.click();
   else if(entry.relatedTab==='drum')$('tabDrum')?.click();
   requestAnimationFrame(()=>{
    const target=$(entry.focusId);
    target?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
   });
  };
 }else go.hidden=true;
 dialog.showModal();
}

export function mountHelpDialog($){
 const dialog=$('studioHelp');
 if(!dialog)return {openHelp:()=>{}};
 $('studioHelpClose')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  if(lastFocus&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});
  lastFocus=null;
 });
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 return {openHelp:id=>openHelp(id,{$})};
}

export function mountHelpTriggers($,{openHelp:open,root=null}={}){
 const show=open??(id=>openHelp(id,{$}));
 (root??document).querySelectorAll('[data-help]').forEach(node=>{
  if(node.dataset.helpBound==='1')return;
  node.dataset.helpBound='1';
  node.addEventListener('click',event=>{
   event.preventDefault();
   event.stopPropagation();
   show(node.dataset.help);
  });
 });
}