import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/seq-ui.css',import.meta.url),'utf8');
const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const keyboard=readFileSync(new URL('../src/keyboard-input.js',import.meta.url),'utf8');
const performance=readFileSync(new URL('../src/performance-play.js',import.meta.url),'utf8');

test('the Arp/Seq workspace is usable and the original Sound controls remain',()=>{
 assert.ok(script,'App module must exist');
 const syntax=spawnSync(process.execPath,['--input-type=module','--check'],{input:script,encoding:'utf8'});
 assert.equal(syntax.status,0,syntax.stderr);
 for(const id of ['tabVoice','tabPlay','voicePanel','playPanel','arpGeneratorsGrid','gameArpPanel','seqGrid','seqRun','seqStop',
  'seqLength','seqReset','gameArpOn','gameArpStyle','arpSync','arpLatch','gameRate',
  'keyboardPanel','keyboardToggle','keyboard','presetOpen','sidStart','recordToggle'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/<style>/);
 assert.match(html,/src\/studio-core\.css\?v=__BUILD_ID__/);
 assert.match(html,/src\/seq-ui\.css\?v=__BUILD_ID__/);
 assert.match(css,/\.workspace\[data-tab="play"\] \.voice-panel\{display:none!important\}/);
 assert.match(css,/\.keyboard-panel\{grid-row:4/);
 const play=html.slice(html.indexOf('id="playPanel"'),html.indexOf('id="drumPanel"'));
 const latchAt=play.indexOf('id="arpLatch"');
 const gameAt=play.indexOf('id="gameArpTitle"');
 const rootAt=play.indexOf('id="rootArpTitle"');
 assert.ok(latchAt>=0&&latchAt<rootAt&&rootAt<gameAt,'latch, Root Arp, then Game Arp');
 assert.match(play,/class="arp-generators-grid"/);
 assert.match(css,/\.arp-generators-grid\{[^}]*flex-direction:column/);
 assert.match(css,/@container \(min-width:560px\)\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.equal(play.includes('LFO'),false,'the Arp panel does not mention LFOs');
 assert.equal(play.includes('<details'),false,'the Root Arp stays visible');
});

test('the step editor provides exactly one dynamic control per step and per lane',()=>{
 assert.match(performance,/seqState\.steps\.forEach\(\(step,index\)=>\{/);
 assert.match(performance,/pitch\.type='range';pitch\.className='seq-note'/);
 assert.match(performance,/gate\.type='button';gate\.className='seq-gate'/);
 assert.match(performance,/length\.type='range';length\.className='seq-duration'/);
 assert.match(performance,/pitch\.addEventListener\('input'/);
 assert.match(performance,/gate\.addEventListener\('click'/);
 assert.match(performance,/gate\.setAttribute\('aria-pressed',String\(enabled\)\)/);
 assert.match(performance,/gate\.textContent=enabled\?'ON':'REST'/);
 assert.match(performance,/length\.addEventListener\('input'/);
// Step edits reaching the transport: test/performance-transport.test.js
 assert.match(css,/grid-template-columns:repeat\(16,minmax\(52px,1fr\)\)/);
 assert.match(css,/overflow-x:auto/);
});

test('custom sequence starts without held keys, handles rests and cancels stale note gates',()=>{
 assert.match(performance,/function gameTick\(\)[\s\S]*?sequenceEvent\(root,seqState,game\.step\+\+\)/);
 assert.match(performance,/if\(!event\.gate\)\{/);
 assert.match(performance,/game\.gateTimer=setTimeout/);
 assert.match(performance,/if\(game\.step!==clock\|\|game\.last!==sounding\)return/);
 assert.match(performance,/if\(!activeNotes\(\)\.length&&!seqPreview\)/);
 assert.match(performance,/if\(game\.gateTimer!==null\)\{clearTimeout\(game\.gateTimer\)/);
 assert.match(performance,/setSeqPreview\(false\);\s*performanceArp\.set\(\{gameOn:false\}\)/);
});

test('keyboard remains full width and can collapse without stopping preview',()=>{
 assert.match(css,/\.keyboard\{width:100%;min-height:0;flex:1\}/);
 assert.match(css,/#keyboard\[hidden\]\{display:none!important\}/);
 assert.match(html,/id="keyboardToggle" aria-expanded="true"/);
 assert.match(keyboard,/function setKeyboardVisible\(visible\)\{/);
 assert.match(keyboard,/for\(const note of transport\.held\)keyUp\(note\)/);
 assert.match(keyboard,/setItem\('project6581\.keyboard-visible'/);
 assert.match(keyboard,/\$\('keyboard'\)\.hidden=!visible/);
});

test('preset settings include the editable phrase and restore its controls',()=>{
 assert.match(script,/rate:Number\(\$\('gameRate'\)\.value\),sequence:transport\.sequence/);
 assert.match(script,/transport\.setSequence\(validateSequence\(next\.performance\.game\.sequence\)\)/);
 assert.match(script,/renderSequenceSteps\(\)/);
});

// 'high-rate gate lengths have no artificial 20 ms minimum': test/performance-transport.test.js

test('step gates are touch-friendly rectangular ON/REST buttons, not round switches',()=>{
 assert.match(css,/\.seq-gate\{[^}]*width:44px[^}]*height:40px[^}]*border-radius:5px/);
 assert.match(css,/\.seq-gate\[aria-pressed="true"\]/);
 assert.match(css,/\.seq-gate\[aria-pressed="false"\]/);
 assert.doesNotMatch(performance,/gate\.type='checkbox'/);
});

test('landscape and compact layouts preserve sequencer lanes and taller keyboard',()=>{
 assert.match(css,/\.keyboard-panel\{grid-row:4;height:clamp\(190px,27dvh,285px\)/);
 assert.match(css,/@media \(min-width:701px\) and \(max-height:1000px\)/);
 assert.match(css,/\.seq-step\{grid-template-rows:21px 112px 42px 44px;gap:0\}/);
 assert.match(css,/\.keyboard-panel\{height:clamp\(185px,26dvh,270px\)\}/);
 assert.match(css,/@media \(max-width:1100px\)\{\s*\.header-toolbar\{display:grid/);
 assert.match(css,/\.seq-grid-scroller\{[^}]*overflow-x:auto/);
 assert.match(css,/@media \(max-height:650px\)/);
 assert.match(css,/\.seq-grid-scroller\{[^}]*touch-action:auto/);
 assert.match(css,/\.workspace \.panel\{scroll-padding-bottom:28px/);
});
