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
 assert.match(performance,/function arpTick\(\)[\s\S]*?selectRoot\(notes,\$\('arpPattern'\)\.value,arp\.step\+\+\)/);
 assert.match(performance,/getArpKeyVisual\(\)\.show\(note,'root'\)/);
 assert.match(performance,/if\(gameEnabled\(\)\)return;/);
 assert.doesNotMatch(performance,/if\(gameEnabled\(\)\)return;[\s\S]*?getArpKeyVisual\(\)\.show\(note,'root'\)/);
});
test('both arpeggiators have independent rate selectors and timers',()=>{
 assert.match(html,/id="gameRate"/);
 assert.match(html,/id="arpRate"/);
 assert.match(performance,/arp\.timer=setInterval\(arpTick,stepMilliseconds\(bpm,\$\('arpRate'\)\.value\)\)/);
 assert.match(performance,/game\.timer=setInterval\(gameTick,stepMilliseconds\(bpm,\$\('gameRate'\)\.value\)\)/);
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
 assert.match(performance,/function releaseDirectNotes\(\)\{\s*for\(const note of directOwned\)stop\(note\);\s*directOwned\.clear\(\)/);
 assert.match(performance,/releaseDirectNotes\(\);\s*if\(!activeNotes\(\)\.length&&!seqPreview\)/);
 assert.match(keyboard,/if\(directOwned\.delete\(note\)\)stop\(note\)/);
 assert.match(script,/directOwned\.clear\(\);activeOwners\.clear\(\);arpKeyVisual\.clear\(\);sidController\?\.panic\(\)/);
});

test('clear latch preserves physical owners and direct notes',()=>{
 const clearHandler=performance.slice(performance.indexOf("$('arpClear').addEventListener"),
  performance.indexOf('return {gameStop'));
 assert.ok(clearHandler.length>0);
 assert.match(clearHandler,/arp\.latched\.clear\(\)/);
 assert.doesNotMatch(clearHandler,/arp\.held\.clear\(\)/);
 assert.doesNotMatch(clearHandler,/directOwned\.clear\(\)/);
 assert.match(script,/const activeNotes=\(\)=>\[\.\.\.\(\$\('arpLatch'\)\.checked&&arp\.latched\.size\?arp\.latched:arp\.held\)\]/);
});

test('released roots do not produce extra out-of-tempo arp ticks',()=>{
 const release=keyboard.slice(keyboard.indexOf('function keyUp(note){'),
  keyboard.indexOf('return {flushQueuedKeys'));
 assert.match(release,/arp\.root=notes\.length\?selectRoot\(notes,\$\('arpPattern'\)\.value,arp\.step\):null/);
 assert.doesNotMatch(release,/arpTick\(\)/);
});
