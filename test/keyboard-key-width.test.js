import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'));

function blackKeyRule(source){
 const match=source.match(/\.key\.black\{([^}]*)\}/);
 assert.ok(match,'Missing black-key styling');
 return match[1];
}
function percent(rule,property){
 const match=rule.match(new RegExp('(?:^|;)\\s*'+property+':\\s*(?:0 0 )?([\\d.]+)%'));
 assert.ok(match,'Missing '+property+' percentage');
 return Number(match[1]);
}
function margin(rule){
 const match=rule.match(/(?:^|;)\s*margin:\s*0\s+-([\d.]+)%/);
 assert.ok(match,'Missing symmetric negative key margins');
 return Number(match[1]);
}
const normal=blackKeyRule(css);
const compactStart=css.indexOf('@media(max-width:900px),(max-height:620px){');
const compactEnd=css.indexOf('@media(max-height:760px)',compactStart);
assert.ok(compactStart!==-1&&compactEnd>compactStart,'Missing iPad/compact keyboard breakpoint');
const compact=blackKeyRule(css.slice(compactStart,compactEnd));

test('25-note layout keeps black keys centered and about 63% of white-key width',()=>{
 // Two complete chromatic octaves plus top C: 15 white keys, 10 black keys.
 const width=percent(normal,'flex'),side=margin(normal);
 assert.ok(Math.abs(width-2*side)<0.001,'Negative margins must balance black-key width');
 const fraction=width/(100/15);
 assert.ok(fraction>=0.60&&fraction<=0.67,'Black-to-white ratio '+fraction.toFixed(2)+' outside piano proportions');
 assert.match(normal,/z-index:2/,'Black keys stay on top of adjacent white keys');
});

test('13-note iPad layout retains the same black-to-white width ratio',()=>{
 // One chromatic octave plus top C: 8 white keys, 5 black keys.
 const width=percent(compact,'flex-basis'),side=margin(compact);
 assert.ok(Math.abs(width-2*side)<0.001,'Compact keys must remain centered');
 const fraction=width/(100/8);
 assert.ok(fraction>=0.60&&fraction<=0.67,'Compact black-to-white ratio '+fraction.toFixed(2)+' outside target');
 const normalFraction=percent(normal,'flex')/(100/15);
 assert.ok(Math.abs(fraction-normalFraction)<=0.03,'Keyboard ratios should stay visually consistent across breakpoints');
});

test('keyboard retains note ordering and one-pointer-per-key ownership',()=>{
 assert.match(html,/const count=compactKeyboard\(\)\?13:25/);
 assert.match(html,/className='key'\+\(names\[note%12\]\.includes\('♯'\)\?' black':''\)/);
 assert.match(html,/key\.setPointerCapture\(e\.pointerId\)/);
 assert.match(html,/if\(activePointer!==e\.pointerId\)return/);
 assert.match(html,/key\.addEventListener\('pointercancel',end\)/);
});
