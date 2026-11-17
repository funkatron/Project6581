import test from 'node:test';
import assert from 'node:assert/strict';
import {
 METER_LOG_FLOOR,
 METER_LOG_REFERENCE,
 meterDisplayFraction,
 meterDisplayHeight,
} from '../src/sid-meter-display.js';

test('log meter maps quiet and loud SID peaks across the strip', () => {
 assert.equal(meterDisplayFraction(0), 0);
 assert.equal(meterDisplayFraction(METER_LOG_FLOOR), 0);
 assert.equal(meterDisplayHeight(METER_LOG_REFERENCE), '100.0%');
 assert.equal(meterDisplayHeight(1), '100.0%');

 const quiet = meterDisplayFraction(0.03);
 const loud = meterDisplayFraction(0.12);
 assert.ok(quiet > 0.2 && quiet < 0.65, `quiet band ${quiet}`);
 assert.ok(loud > 0.88, `loud band ${loud}`);
 assert.ok(loud > quiet + 0.25);
});

test('reference constants match documented calibration', () => {
 assert.ok(METER_LOG_REFERENCE > METER_LOG_FLOOR);
 assert.ok(METER_LOG_FLOOR < 0.02);
});