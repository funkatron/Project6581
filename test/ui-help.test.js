import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HELP_CONTENT} from '../src/ui-help-content.js';
import {readStudioCoreCss} from './studio-css.mjs';

test('help content includes core topics',()=>{
 for(const id of ['latch','play-target-keyboard','root-arp','game-arp','keyboard'])
  assert.ok(HELP_CONTENT[id],id);
});

test('index provides studio help dialog and latch help trigger',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="studioHelp"/);
 assert.match(html,/data-help="latch"/);
 assert.doesNotMatch(html,/Touch and hold · layered unison/);
 assert.match(html,/data-help="play-target-keyboard"/);
 assert.match(html,/id="arpLatchHelpSr"/);
});

test('help popover styles are present',()=>{
 const css=readStudioCoreCss();
 assert.match(css,/\.help-popover\{/);
 assert.match(css,/\.help-trigger\{/);
});