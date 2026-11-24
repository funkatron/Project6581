import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {readStudioCss} from './studio-css.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const studioCss=readStudioCss();
const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const keyboard=readFileSync(new URL('../src/keyboard-input.js',import.meta.url),'utf8');

test('inline keyboard application remains valid JavaScript after adding the visual module',()=>{
 assert.ok(script,'module script must exist');
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(script,/let flushQueuedKeys=\(\)=>\{\}/);
});

// Arp / Game Arp playback, timers, phrase-boundary roots, highlight clearing and
// direct-note hand-off are behavioral tests in test/performance-transport.test.js.
test('both arpeggiators have independent rate selectors',()=>{
 assert.match(html,/id="gameRate"/);
 assert.match(html,/id="arpRate"/);
});

test('panic clears every arpeggiator key highlight',()=>{
 assert.match(script,/function panic\(reason=[\s\S]*?arpKeyVisual\.clear\(\)/);
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

test('studio and keyboard keep direct-note ownership for arp hand-off',()=>{
 assert.match(script,/const directOwned=new Set\(\)/);
 assert.match(keyboard,/if\(directOwned\.delete\(note\)\)stop\(note\)/);
 assert.match(script,/directOwned\.clear\(\);activeOwners\.clear\(\);arpKeyVisual\.clear\(\);sidController\?\.panic\(\)/);
});

