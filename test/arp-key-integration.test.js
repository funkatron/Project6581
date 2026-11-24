import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {readStudioCss} from './studio-css.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const studioCss=readStudioCss();
const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const keyboard=readFileSync(new URL('../src/keyboard-input.js',import.meta.url),'utf8');
const performance=readFileSync(new URL('../src/performance-play.js',import.meta.url),'utf8');

test('inline keyboard application remains valid JavaScript after adding the visual module',()=>{
 assert.ok(script,'module script must exist');
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(script,/let flushQueuedKeys=\(\)=>\{\}/);
});

test('Game Arp voices its pattern, while regular Arp owns the selected root',()=>{
 assert.match(performance,/function gameTick\(\)[\s\S]*?sequenceEvent\(root,seqState,game\.step\+\+\)/);
 assert.doesNotMatch(performance,/patternPitch\(/);
 assert.match(performance,/loadBuiltInPhrase\(\$\('gameArpStyle'\)\.value\)/);
 assert.match(performance,/play\(game\.last,'game'\);getArpKeyVisual\(\)\.show\(game\.last,'game'\)/);
 assert.match(performance,/getArpKeyVisual\(\)\.show\(note,'root'\)/);
// Root changes only on a Game Arp phrase boundary: test/performance-transport.test.js
 assert.match(performance,/if\(gameEnabled\(\)\)\{[\s\S]*?return;\s*\}/);
});
// Timer behavior: test/performance-transport.test.js
test('both arpeggiators have independent rate selectors',()=>{
 assert.match(html,/id="gameRate"/);
 assert.match(html,/id="arpRate"/);
});

test('all arpeggiator release paths remove the visual highlight',()=>{
 assert.match(performance,/function gameStop\(\)[\s\S]*?getArpKeyVisual\(\)\.clear\('game'\)/);
 assert.match(performance,/function arpStopVoice\(\)[\s\S]*?getArpKeyVisual\(\)\.clear\('root'\)/);
 assert.match(script,/function panic\(reason=[\s\S]*?arpKeyVisual\.clear\(\)/);
 assert.match(performance,/\$\('arpClear'\)\.addEventListener\('click'/);
});

test('visual style remains independent from pressed keys and contains no animation',()=>{
 assert.match(studioCss,/\.key\.arp-playing-root:not\(\.down\)/);
 assert.match(studioCss,/\.key\.arp-playing-game:not\(\.down\)/);
 assert.match(studioCss,/\.key\.down\.arp-playing-root/);
 assert.match(studioCss,/\.key\.down\.arp-playing-game/);
 assert.doesNotMatch(html,/id="arpVisualNote"|class="arp-visual-note"/);
 assert.doesNotMatch(script,/showLabel:|noteName:|arpVisualNote/);
 assert.doesNotMatch(html,/\.key\.arp-playing-(?:root|game)[^\{]*\{[^}]*animation\s*:/);
});

test('changing note text cannot move the keyboard octave controls',()=>{
 assert.match(studioCss,/\.keyboard-heading\s*\{[^}]*display:grid;grid-template-columns:minmax\(0,1fr\) max-content max-content/);
 assert.match(studioCss,/\.keyboard-heading \.octave-controls\s*\{[^}]*min-width:max-content/);
 assert.doesNotMatch(html,/\.arp-visual-note\s*\{/);
});

test('direct polyphonic notes are released before an arpeggiator takes ownership',()=>{
 assert.match(script,/const directOwned=new Set\(\)/);
 assert.match(performance,/function releaseDirectNotes\(\)\{[\s\S]*?const seen=new Set\(\)/);
 assert.match(performance,/releaseDirectNotes\(\);\s*if\(!activeNotes\(\)\.length&&!seqPreview\)/);
 assert.match(keyboard,/if\(directOwned\.delete\(note\)\)stop\(note\)/);
 assert.match(script,/directOwned\.clear\(\);activeOwners\.clear\(\);arpKeyVisual\.clear\(\);sidController\?\.panic\(\)/);
});

// 'clear latch preserves physical owners and direct notes': test/performance-transport.test.js

// 'released roots do not produce extra out-of-tempo arp ticks' is now behavioral:
// test/performance-transport.test.js
