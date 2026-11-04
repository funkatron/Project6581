import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('inline keyboard application remains valid JavaScript after adding the visual module',()=>{
 assert.ok(script,'module script must exist');
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

test('Game Arp voices its pattern, while regular Arp owns the selected root',()=>{
 assert.match(script,/function gameTick\(\)[\s\S]*?patternPitch\(root,\$\('gameArpStyle'\)\.value,game\.step\+\+\)/);
 assert.match(script,/play\(game\.last\);arpKeyVisual\.show\(game\.last\)/);
 assert.match(script,/function arpTick\(\)[\s\S]*?selectRoot\(notes,\$\('arpPattern'\)\.value,arp\.step\+\+\)/);
 assert.match(script,/arp\.last=note;play\(note\);arpKeyVisual\.show\(note\)/);
 assert.match(script,/if\(gameEnabled\(\)\)return;/);
});
test('both arpeggiators have independent rate selectors and timers',()=>{
 assert.match(html,/id="gameRate"/);
 assert.match(html,/id="arpRate"/);
 assert.match(script,/arp\.timer=setInterval\(arpTick,stepMilliseconds\(bpm,\$\('arpRate'\)\.value\)\)/);
 assert.match(script,/game\.timer=setInterval\(gameTick,stepMilliseconds\(bpm,\$\('gameRate'\)\.value\)\)/);
});

test('all arpeggiator release paths remove the visual highlight',()=>{
 assert.match(script,/function gameStop\(\)[\s\S]*?arpKeyVisual\.clear\(\)/);
 assert.match(script,/function arpStopVoice\(\)[\s\S]*?arpKeyVisual\.clear\(\)/);
 assert.match(script,/function panic\(\)[^\n]*?arpKeyVisual\.clear\(\)/);
 assert.match(script,/\$\('arpClear'\)\.addEventListener\('click'/);
});

test('visual style remains independent from pressed keys and contains no animation',()=>{
 assert.match(html,/\.key\.arp-playing:not\(\.down\)/);
 assert.match(html,/\.key\.down\.arp-playing/);
 assert.doesNotMatch(html,/id="arpVisualNote"|class="arp-visual-note"/);
 assert.doesNotMatch(script,/showLabel:|noteName:|arpVisualNote/);
 assert.doesNotMatch(html,/\.key\.arp-playing[^\{]*\{[^}]*animation\s*:/);
});

test('changing note text cannot move the keyboard octave controls',()=>{
 assert.match(html,/\.keyboard-heading\s*\{[^}]*display:grid;grid-template-columns:minmax\(0,1fr\) max-content max-content/);
 assert.match(html,/\.keyboard-heading \.octave-controls\s*\{[^}]*min-width:max-content/);
 assert.doesNotMatch(html,/\.arp-visual-note\s*\{/);
});
