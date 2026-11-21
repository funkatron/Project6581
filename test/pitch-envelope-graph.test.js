import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchEnvelopeTemplates} from '../src/pitch-envelope-editor.js';
import {
 pitchGraphAxes,
 pointToGraph,
 clampDraggedPoint,
 hitTestPitchPoint,
 proposePitchPoint
} from '../src/pitch-envelope-graph.js';

test('a kick drop fills a short time axis instead of a ten second ruler',()=>{
 const points=pitchEnvelopeTemplates().kick.points;
 const axes=pitchGraphAxes(points);
 assert.equal(axes.timeMax,200);
 assert.equal(axes.semitoneMax,26);
 const last=pointToGraph(points[2],axes,200,160);
 assert.equal(last.x,160);
 assert.ok(last.x>100,'the end of the kick stays in the right half of the graph');
});

test('the first breakpoint cannot leave note-on',()=>{
 const points=pitchEnvelopeTemplates().kick.points;
 const locked=clampDraggedPoint(0,80,6,points);
 assert.equal(locked.ms,0);
 assert.equal(locked.semitones,6);
 const floor=clampDraggedPoint(0,0,-90,points);
 assert.equal(floor.semitones,-48);
});

test('a dragged breakpoint stops before it crosses its neighbor',()=>{
 const points=pitchEnvelopeTemplates().kick.points;
 const blocked=clampDraggedPoint(1,500,-18,points);
 assert.equal(blocked.ms,159);
  assert.equal(blocked.semitones,-18);
  const early=clampDraggedPoint(2,10,-6,points);
  assert.equal(early.ms,29);
});

test('a tap in empty space proposes a valid breakpoint',()=>{
 const points=pitchEnvelopeTemplates().kick.points;
 const axes=pitchGraphAxes(points);
 const width=200;
 const height=160;
 const proposed=proposePitchPoint(80,116.36,points,axes,width,height,4);
 assert.equal(proposed.index,2);
 assert.deepEqual(proposed.point,{ms:80,semitones:-12});
 const ordered=[...points];
 ordered.splice(proposed.index,0,proposed.point);
 for(let i=1;i<ordered.length;i++)assert.ok(ordered[i].ms>ordered[i-1].ms);
 assert.equal(proposePitchPoint(80,116.36,ordered,axes,width,height,4),null);
 const handle=pointToGraph(points[1],axes,width,height);
 assert.equal(hitTestPitchPoint(handle.x,handle.y,points,axes,width,height,22),1);
});
