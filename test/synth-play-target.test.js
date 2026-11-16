import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('keyboard route lives on SYNTH tab; ARP tab has arp-only targets',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const voice=html.slice(html.indexOf('id="voicePanel"'),html.indexOf('id="playPanel"'));
 const play=html.slice(html.indexOf('id="playPanel"'),html.indexOf('id="lfoPanel"'));
 assert.match(voice,/id="keyboardRoute"/);
 assert.match(voice,/play-target/);
 assert.doesNotMatch(play,/id="keyboardRoute"/);
 assert.match(play,/id="arpRoute"/);
 assert.match(play,/id="gameRoute"/);
 assert.doesNotMatch(html,/note-routing-hint/);
});