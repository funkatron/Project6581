import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'));

function property(selector,name){
 const start=css.lastIndexOf(selector+'{');
 assert.ok(start!==-1,'Missing CSS selector '+selector);
 const end=css.indexOf('}',start);
 assert.ok(end>start,'Unterminated CSS block for '+selector);
 const rules=css.slice(start+selector.length+1,end).split(';');
 const rule=rules.find(part=>part.trimStart().startsWith(name+':'));
 assert.ok(rule,'Missing '+name+' in '+selector);
 const value=rule.slice(rule.indexOf(':')+1).trim();
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
 ['preset dialog descriptions','#presetDialog small,#presetDialog .preset-empty,#presetDialog .preset-item-category','.preset-group'],
 ['preset status','#presetStatus','#presetDialog'],
 ['preset export link','#presetExportLink:not([hidden])','#presetDialog'],
 ['highlighted black piano keys','.key.black.arp-playing:not(.down)','.key.black.arp-playing:not(.down)'],
 ['modulated slider readout','label>.modulated-value','.panel,.keyboard-panel'],
 ['LFO legends','.lfo-controls legend','.lfo-controls'],
 ['master BPM number','.master-tempo output','header'],
 ['normal buttons','button,select,.master-tempo input','button,select,.master-tempo input'],
 ['selected preset','.preset-item[aria-current="true"]','.preset-item[aria-current="true"]']
];
for(const [label,foregroundSelector,backgroundSelector] of samples){
 test('normal-size text contrast: '+label,()=>{
  const color=(label==='highlighted black piano keys'||label==='normal buttons'||label==='selected preset')
   ?'#ffffff':property(foregroundSelector,'color');
  const background=property(backgroundSelector,'background');
  const actual=ratio(color,background);
  assert.ok(actual>=4.5,label+' contrast '+actual.toFixed(2)+':1 does not meet 4.5:1');
 });
}
