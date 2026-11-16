import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tabsModule=readFileSync(new URL('../src/editor-tabs.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/seq-ui.css',import.meta.url),'utf8');
test('each editor tab hides both inactive panels and retains the existing controls',()=>{
 const events=new Map(),nodes=new Map();
 const tabs=['tabVoice','tabPlay','tabLfos'],panels=['voicePanel','playPanel','lfoPanel'];
 for(const [i,id] of tabs.entries()){
  nodes.set(id,{attributes:{},addEventListener:(type,handler)=>events.set(id,handler),
   setAttribute(name,value){this.attributes[name]=value;}});
  nodes.set(panels[i],{hidden:i!==0,getAttribute:()=>id,control:{value:17}});
 }
 const diagPanel={id:'diagPanel',hidden:true,getAttribute:()=>null,control:{value:0}};
 nodes.set('diagPanel',diagPanel);
 nodes.set('workspace',{dataset:{tab:'voice'},querySelectorAll:()=>[...panels.map(id=>nodes.get(id)),diagPanel]});
 const sandbox={$:id=>nodes.get(id)};
 const script=tabsModule.replace(/export function /g,'function ')+'\nmountEditorTabs({$});';
 vm.runInNewContext(script,sandbox);
 for(const selected of [2,0,1,2,1,0]){
  const controls=panels.map(id=>nodes.get(id).control);
  events.get(tabs[selected])();
  assert.equal(nodes.get('workspace').dataset.tab,['voice','play','lfos'][selected]);
  assert.equal(diagPanel.hidden,true);
  panels.forEach((id,i)=>{
   assert.equal(nodes.get(id).hidden,i!==selected);
   assert.equal(nodes.get(tabs[i]).attributes['aria-selected'],String(i===selected));
   assert.equal(nodes.get(id).control,controls[i]);
  });
 }
});
test('inactive panels start hidden and the hidden rule wins at every viewport',()=>{
 for(const id of ['playPanel','lfoPanel'])assert.match(html,new RegExp('id="'+id+'" hidden role="tabpanel"'));
 assert.match(css,/\.workspace\s*>\s*\[role="tabpanel"\]\[hidden\]\s*\{display:none!important\}/);
});
