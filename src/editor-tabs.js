const TAB_BINDINGS=[['voice','tabVoice'],['play','tabPlay'],['lfos','tabLfos']];
const TAB_ID={voice:'tabVoice',play:'tabPlay',lfos:'tabLfos'};

export function activateEditorTab($,name){
 const id=TAB_ID[name];
 id&&$(id)?.click();
}

export function mountEditorTabs({$}={}){
 if(!$)throw new TypeError('mountEditorTabs requires $');
 for(const [name,id] of TAB_BINDINGS){
  $(id).addEventListener('click',()=>{
   $('workspace').dataset.tab=name;
   for(const panel of $('workspace').querySelectorAll(':scope > [role="tabpanel"]'))panel.hidden=panel.getAttribute('aria-labelledby')!==id;
   $('tabVoice').setAttribute('aria-selected',String(name==='voice'));
   $('tabPlay').setAttribute('aria-selected',String(name==='play'));
   $('tabLfos').setAttribute('aria-selected',String(name==='lfos'));
  });
 }
 return {activateTab:name=>activateEditorTab($,name)};
}