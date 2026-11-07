import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/seq-ui.css',import.meta.url),'utf8');
test('each editor tab hides both inactive panels and retains the existing controls',()=>{
 const events=new Map(),nodes=new Map();
 const tabs=['tabVoice','tabPlay','tabLfos'],panels=['voicePanel','playPanel','lfoPanel'];
 for(const [i,id] of tabs.entries()){
  nodes.set(id,{attributes:{},addEventListener:(type,handler)=>events.set(id,handler),
   setAttribute(name,value){this.attributes[name]=value;}});
  nodes.set(panels[i],{hidden:i!==0,getAttribute:()=>id,control:{value:17}});
 }
 nodes.set('workspace',{dataset:{tab:'voice'},querySelectorAll:()=>panels.map(id=>nodes.get(id))});
 const block=html.match(/for\(const \[name,id\] of \[\['voice','tabVoice'\][\s\S]*?\n\}\nconst activeOwners/)?.[0].replace(/\nconst activeOwners$/,'');
 assert.ok(block,'Execute the production tab bindings');
 vm.runInNewContext(block,{$:id=>nodes.get(id)});
 for(const selected of [2,0,1,2,1,0]){
  const controls=panels.map(id=>nodes.get(id).control);
  events.get(tabs[selected])();
  assert.equal(nodes.get('workspace').dataset.tab,['voice','play','lfos'][selected]);
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
