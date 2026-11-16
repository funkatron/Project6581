import test from 'node:test';
import assert from 'node:assert/strict';
import {METER_DISPLAY_GAIN,meterDisplayHeight} from '../src/sid-meter-display.js';

test('meter display gain maps typical chip peaks near full scale',()=>{
 assert.equal(meterDisplayHeight(0.36),'99.0%');
 assert.equal(meterDisplayHeight(0),'0.0%');
 assert.equal(meterDisplayHeight(1),'100.0%');
 assert.ok(METER_DISPLAY_GAIN>=2.5);
});