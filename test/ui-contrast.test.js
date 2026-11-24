import test from 'node:test';
import assert from 'node:assert/strict';

import {readStudioCoreCss} from './studio-css.mjs';

const css=readStudioCoreCss();

function property(selector,name){
 const needle=selector+'{';
 let offset=0,found=false,value=null,start;
 // A later rule might only change spacing, so find the last declaration of
 // the property rather than assuming the selector's last block defines it.
 while((start=css.indexOf(needle,offset))!==-1){
  found=true;
  const end=css.indexOf('}',start);
  assert.ok(end>start,'Unterminated CSS block for '+selector);
  const rules=css.slice(start+needle.length,end).split(';');
  const rule=rules.find(part=>part.trimStart().startsWith(name+':'));
  if(rule)value=rule.slice(rule.indexOf(':')+1).trim();
  offset=end+1;
 }
 assert.ok(found,'Missing CSS selector '+selector);
 assert.ok(value,'Missing '+name+' in '+selector);
 assert.match(value,/^#[0-9a-f]{6}$/i,'Expected an explicit six-digit color for '+selector);
 return value;
}
function luminance(hex){
 const values=[1,3,5].map(i=>{
  const channel=parseInt(hex.slice(i,i+2),16)/255;
  return channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4;
 });
 return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
}
function ratio(foreground,background){
 const [bright,dark]=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
 return (bright+0.05)/(dark+0.05);
}
const samples=[
 ['recording status','#recordStatus','.statusbar'],
 ['download recording','#recordDownload','.statusbar'],
 ['preset dialog title','#presetDialog h2,#presetDialog h3','#presetDialog'],
 ['preferences dialog title','#preferencesDialog h2,#preferencesDialog h3','#preferencesDialog'],
 ['preferences hint','#preferencesDialog .preferences-hint','#preferencesDialog'],
 ['preset dialog descriptions','#presetDialog small,#presetDialog .preset-empty,#presetDialog .preset-item-category','.preset-group'],
 ['preset status','#presetStatus','#presetDialog'],
 ['preset export link','#presetExportLink:not([hidden])','#presetDialog'],
 ['highlighted black piano keys (root arp)','.key.black.arp-playing-root:not(.down)','.key.black.arp-playing-root:not(.down)'],
 ['highlighted black piano keys (game arp)','.key.black.arp-playing-game:not(.down)','.key.black.arp-playing-game:not(.down)'],
 ['modulated slider readout','label>.modulated-value','.panel,.keyboard-panel'],
 ['LFO legends','.lfo-controls legend','.lfo-controls'],
 ['master BPM number','.master-tempo output','main>header'],
 ['normal buttons','button,select,.master-tempo input','button,select,.master-tempo input'],
 ['selected preset','.preset-item[aria-current="true"]','.preset-item[aria-current="true"]']
];
for(const [label,foregroundSelector,backgroundSelector] of samples){
 test('normal-size text contrast: '+label,()=>{
  const color=(label.startsWith('highlighted black piano keys')||label==='normal buttons'||label==='selected preset')
   ?'#ffffff':property(foregroundSelector,'color');
  const background=property(backgroundSelector,'background');
  const actual=ratio(color,background);
  assert.ok(actual>=4.5,label+' contrast '+actual.toFixed(2)+':1 does not meet 4.5:1');
 });
}
