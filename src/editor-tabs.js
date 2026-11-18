const TAB_BINDINGS=[['voice','tabVoice'],['play','tabPlay'],['drum','tabDrum'],['lfos','tabLfos']];
const TAB_ID={voice:'tabVoice',play:'tabPlay',drum:'tabDrum',lfos:'tabLfos'};

export function activateEditorTab($,name){
 const id=TAB_ID[name];
 id&&$(id)?.click();
}

export function mountEditorTabs({$}={}){
 if(!$)throw new TypeError('mountEditorTabs requires $');
 for(const [name,id] of TAB_BINDINGS){
  $(id).addEventListener('click',()=>{
   $('workspace').dataset.tab=name;
   for(const panel of $('workspace').querySelectorAll(':scope > [role="tabpanel"]')){
    if(panel.id==='diagPanel'){panel.hidden=true;continue}
    panel.hidden=panel.getAttribute('aria-labelledby')!==id;
   }
   for(const [tabName,tabId] of TAB_BINDINGS){
    $(tabId).setAttribute('aria-selected',String(name===tabName));
   }
  });
 }
 return {activateTab:name=>activateEditorTab($,name)};
}