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

test('Game Arp and regular Arp follow their generated note, not the physical root',()=>{
 assert.match(script,/function gameTick\(\)[\s\S]*?play\(game\.last\);\s*arpKeyVisual\.show\(game\.last\);/);
 assert.match(script,/function arpTick\(\)[^\n]*?play\(note\);arpKeyVisual\.show\(note\);/);
});

test('all arpeggiator release paths remove the visual highlight',()=>{
 assert.match(script,/function gameStop\(\)[^\n]*?arpKeyVisual\.clear\(\)/);
 assert.match(script,/function arpStopVoice\(\)[^\n]*?arpKeyVisual\.clear\(\)/);
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
