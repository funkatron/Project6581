import {FACTORY_PRESETS,FACTORY_GROUPS,factoryGroup,PRESET_VERSION,cleanPresetName,readUserPresets,writeUserPresets,exportPreset,exportPresetBank,importPresetFile} from "./preset-library.js?v=0.19.0+20261123T184822635Z";

// Dialog, save, rename, import, and export. Applying a sound and switching
// the SID model stay with the studio, which owns the keyboard and the engine.
export function mountPresetLibrary({$,snapshotSettings,applySettings,setLoading,isLoading}){
 const snapshotPresetSettings=snapshotSettings;
 const applyPresetSettings=applySettings;
 const setPresetLoading=setLoading;
 let userPresets=[],selectedPreset=null,presetDirty=false,presetStorageError=null,presetDownloadUrl=null;
 try{userPresets=readUserPresets(window.localStorage)}
 catch(error){presetStorageError=error.message||String(error)}
 function currentPreset(){
  if(selectedPreset?.kind==='factory')return FACTORY_PRESETS.find(preset=>preset.id===selectedPreset.id)||null;
  if(selectedPreset?.kind==='user')return userPresets.find(preset=>preset.id===selectedPreset.id)||null;
  return null;
 }
 function presetMessage(message){
  $('presetStatus').textContent=message;
 }
 function renderPresetLibrary(message=null){
  const loading=isLoading();
  const selected=selectedPreset?selectedPreset.kind+':'+selectedPreset.id:null;
  for(const [kind,presets,listId] of [
   ['factory',FACTORY_PRESETS,'factoryPresetList'],['user',userPresets,'userPresetList']
  ]){
   const list=$(listId);
   // Stable category headings make the 30 factory sounds navigable without changing preset IDs.
   const ordered=kind==='factory'
    ?[...presets].sort((a,b)=>FACTORY_GROUPS.indexOf(factoryGroup(a.category))-FACTORY_GROUPS.indexOf(factoryGroup(b.category)))
    :presets;
   const items=[];
   let previousGroup=null;
   for(const preset of ordered){
    if(kind==='factory'){
     const group=factoryGroup(preset.category);
     if(group!==previousGroup){
      const heading=document.createElement('div');
      heading.className='preset-category-heading';
      heading.setAttribute('role','heading');
      heading.setAttribute('aria-level','4');
      heading.textContent=group;
      items.push(heading);
      previousGroup=group;
     }
    }
    const button=document.createElement('button');
    button.type='button';button.className='preset-item';
    button.dataset.kind=kind;button.dataset.id=preset.id;
    button.append(document.createTextNode(preset.name));
    if(kind==='factory'){
     const category=document.createElement('span');
     category.className='preset-item-category';category.textContent=preset.category;
     button.append(category);
    }
    button.setAttribute('aria-current',String(selected===kind+':'+preset.id));
    items.push(button);
   }
   if(!items.length){
    const empty=document.createElement('div');empty.className='preset-empty';
    empty.textContent='No user presets yet. Use Save as… to create one.';
    items.push(empty);
   }
   list.replaceChildren(...items);
  }
  const editable=selectedPreset?.kind==='user';
  $('presetSave').disabled=loading||!editable;
  $('presetRename').disabled=loading||!editable;
  $('presetDelete').disabled=loading||!editable;
  $('presetExportBank').disabled=loading||!userPresets.length;
  for(const id of ['presetSaveAs','presetExport','presetImport'])$(id).disabled=loading;
  for(const id of ['factoryPresetList','userPresetList'])
   $(id).querySelectorAll('button').forEach(button=>button.disabled=loading);
  const p=currentPreset();
  const name=p?.name||'Current sound';
  $('presetCurrent').textContent=name+(presetDirty?' •':'');
  $('presetOpen').title=name+(presetDirty?' (unsaved changes)':'')+' · Open presets';
  $('presetOpen').setAttribute('aria-label','Open preset library. '+name+(presetDirty?', unsaved changes':''));
  const description=p?name+(presetDirty?' · unsaved changes':''):'Current sound';
  presetMessage(message??(presetStorageError?'Local preset storage unavailable: '+presetStorageError:description));
 }
 function refreshDirty(){
  const preset=currentPreset();
  const changed=Boolean(preset)&&JSON.stringify(snapshotPresetSettings())!==JSON.stringify(preset.settings);
  if(changed!==presetDirty){presetDirty=changed;renderPresetLibrary();}
 }
 function newPresetId(){
  return typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'
   ?crypto.randomUUID():'local-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 }
 function savePresetList(next){
  if(presetStorageError)throw new Error('Local storage is unavailable. Export your sound as JSON instead.');
  userPresets=writeUserPresets(window.localStorage,next);
 }
 function exportPresetFile(json,filename){
  if(presetDownloadUrl)URL.revokeObjectURL(presetDownloadUrl);
  const blob=new Blob([json],{type:'application/json'});
  presetDownloadUrl=URL.createObjectURL(blob);
  const anchor=$('presetExportLink');
  anchor.href=presetDownloadUrl;anchor.download=filename;anchor.hidden=false;
  anchor.textContent='Download JSON';
  anchor.click();
  presetMessage('File ready · tap Download JSON if it did not download');
 }
 function guardPresetAction(work){
  if(isLoading())return null;
  try{return work()}catch(error){presetMessage('Preset error: '+(error.message||error));return null}
 }
 $('presetOpen').addEventListener('click',()=>{
  if(!$('presetDialog').open)$('presetDialog').showModal();
 });
 $('presetClose').addEventListener('click',()=>$('presetDialog').close());
 $('presetDialog').addEventListener('click',event=>{
  if(event.target===$('presetDialog'))$('presetDialog').close();
 });
 async function loadSelectedPreset(kind,id){
  if(isLoading())return;
  const source=kind==='factory'?FACTORY_PRESETS:kind==='user'?userPresets:null;
  const preset=source?.find(item=>item.id===id);
  if(!preset){presetMessage('Preset not found');return}
  if(presetDirty&&!window.confirm('Discard unsaved changes to this preset?'))return;
  setPresetLoading(true);
  try{
   const outcome=await applyPresetSettings(preset.settings);
   selectedPreset={kind,id};presetDirty=false;renderPresetLibrary();
   presetMessage(outcome.silenced
    ?'Loaded '+preset.name+' · held notes stopped (routing or voices changed)'
    :'Loaded '+preset.name+' · held notes may continue');
   $('presetDialog').close();
  }catch(error){presetMessage('Could not load preset: '+(error.message||error))}
  finally{
   setPresetLoading(false);
  }
 }
 for(const listId of ['factoryPresetList','userPresetList']){
  $(listId).addEventListener('click',event=>{
   const button=event.target.closest('button.preset-item');
   if(button&&$(listId).contains(button))
    void loadSelectedPreset(button.dataset.kind,button.dataset.id);
  });
 }
 $('presetSave').addEventListener('click',()=>guardPresetAction(()=>{
  if(selectedPreset?.kind!=='user')return;
  const index=userPresets.findIndex(preset=>preset.id===selectedPreset.id);
  if(index<0)throw new Error('User preset not found');
  const next=userPresets.slice();
  next[index]={...next[index],settings:snapshotPresetSettings()};
  savePresetList(next);presetDirty=false;renderPresetLibrary('Saved '+next[index].name);
 }));
 $('presetSaveAs').addEventListener('click',()=>guardPresetAction(()=>{
  const suggested=currentPreset()?.name||'My SID Sound';
  const answer=window.prompt('Name your preset',suggested);
  if(answer===null)return;
  const name=cleanPresetName(answer);
  if(userPresets.some(preset=>preset.name.toLowerCase()===name.toLowerCase()))
   throw new Error('That name already exists. Choose a different name or use Save.');
  const preset={id:newPresetId(),name,settings:snapshotPresetSettings()};
  savePresetList([...userPresets,preset]);
  selectedPreset={kind:'user',id:preset.id};presetDirty=false;renderPresetLibrary('Saved '+name);
 }));
 $('presetRename').addEventListener('click',()=>guardPresetAction(()=>{
  if(selectedPreset?.kind!=='user')return;
  const preset=currentPreset();if(!preset)return;
  const answer=window.prompt('Rename user preset',preset.name);
  if(answer===null)return;
  const name=cleanPresetName(answer);
  if(userPresets.some(item=>item.id!==preset.id&&item.name.toLowerCase()===name.toLowerCase()))
   throw new Error('A preset already uses that name');
  savePresetList(userPresets.map(item=>item.id===preset.id?{...item,name}:item));
  renderPresetLibrary('Renamed '+name);
 }));
 $('presetDelete').addEventListener('click',()=>guardPresetAction(()=>{
  if(selectedPreset?.kind!=='user')return;
  const preset=currentPreset();if(!preset||!window.confirm('Delete '+preset.name+'? This cannot be undone.'))return;
  savePresetList(userPresets.filter(item=>item.id!==preset.id));
  selectedPreset=null;presetDirty=false;renderPresetLibrary('Deleted preset; current sound remains loaded');
 }));
 $('presetExport').addEventListener('click',()=>guardPresetAction(()=>{
  const name=currentPreset()?.name||'Current sound';
  const data=exportPreset({name,settings:snapshotPresetSettings()});
  exportPresetFile(data,'project6581-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json');
 }));
 $('presetExportBank').addEventListener('click',()=>guardPresetAction(()=>{
  if(!userPresets.length)throw new Error('Save a user preset before exporting a bank');
  exportPresetFile(exportPresetBank(userPresets),'project6581-preset-bank.json');
 }));
 $('presetImport').addEventListener('click',()=>{if(!isLoading())$('presetFile').click()});
 $('presetFile').addEventListener('change',async()=>{
  const input=$('presetFile'),file=input.files?.[0];
  if(!file)return;
  if(isLoading()){input.value='';return}
  setPresetLoading(true);
  try{
   if(file.size>2*1024*1024)throw new Error('Preset file is larger than 2 MB');
   const imported=importPresetFile(await file.text());
   const existing=new Map(userPresets.map(preset=>[preset.name.toLowerCase(),preset]));
   const conflicts=imported.filter(preset=>existing.has(preset.name.toLowerCase()));
   if(conflicts.length&&!window.confirm('Replace '+conflicts.length+' existing user preset(s) with matching names?')){
    presetMessage('Import canceled');return;
   }
   for(const preset of imported){
    const prior=existing.get(preset.name.toLowerCase());
    existing.set(preset.name.toLowerCase(),{id:prior?.id??newPresetId(),...preset});
   }
   savePresetList([...existing.values()]);
   const selected=currentPreset();
   presetDirty=Boolean(selected)&&JSON.stringify(snapshotPresetSettings())!==JSON.stringify(selected.settings);
   const importedMessage='Imported '+imported.length+' preset(s).'+
    (presetDirty?' Selected preset has unsaved changes; Save will replace the imported settings.':
     ' Choose one from My presets.');
   renderPresetLibrary(importedMessage);
  }catch(error){presetMessage('Import failed: '+(error.message||error))}
  finally{input.value='';setPresetLoading(false)}
 });
 document.addEventListener('input',event=>{
  if(event.target.id==='presetFile')return;
  if(event.target.closest('#voicePanel')||event.target.closest('#playPanel')||event.target.id==='masterBpm')
   refreshDirty();
 });
 document.addEventListener('change',event=>{
  if(event.target.id==='presetFile')return;
  if(event.target.closest('#voicePanel')||event.target.closest('#playPanel')||event.target.id==='masterBpm')
   refreshDirty();
 });
 renderPresetLibrary();
 function selectFactoryPreset(id){
  if(!FACTORY_PRESETS.some(preset=>preset.id===id))return false;
  selectedPreset={kind:'factory',id};
  presetDirty=false;
  renderPresetLibrary();
  return true;
 }
 return {
  refreshDirty,
  selectFactoryPreset,
  selectedKind(){return selectedPreset?.kind??null},
  userCount(){return userPresets.length}
 };
}

void PRESET_VERSION;
