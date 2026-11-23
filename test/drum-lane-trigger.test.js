import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drumBpm,
  drumBusVolumeForLane,
  drumLaneLevelGain,
  drumLaneTimbre,
  drumOwnerKey,
  drumReleaseMilliseconds,
  isDrumOwner,
} from '../src/drum-lane-trigger.js';
import {defaultDrumKit} from '../src/drum-step-sequencer.js';
import {FACTORY_PRESETS} from '../src/preset-library.js';

test('drumOwnerKey and isDrumOwner', () => {
  assert.equal(drumOwnerKey('kick'), 'drum:kick');
  assert.equal(isDrumOwner('drum:sn'), true);
  assert.equal(isDrumOwner('game'), false);
});

test('drumLaneTimbre merges optional lane voice and filter patches', () => {
  const kick = FACTORY_PRESETS.find((p) => p.id === 'low-thud-kick');
  const lane = {...defaultDrumKit().lanes.kick, voice: {attack: 0.05}, filter: {cutoff: 400}};
  const {voice, filter} = drumLaneTimbre(kick.settings, lane);
  assert.equal(voice.attack, 0.05);
  assert.equal(filter.cutoff, 400);
});

test('drumLaneTimbre applies lane level to legacy filter volume and noise decay', () => {
  const kick = FACTORY_PRESETS.find((p) => p.id === 'low-thud-kick');
  const lane = defaultDrumKit().lanes.kick;
  const {voice, filter} = drumLaneTimbre(kick.settings, lane);
  assert.equal(voice.wave, 'triangle+noise');
  assert.equal(filter.volume, 92);
  const half = drumLaneTimbre(kick.settings, {...lane, level: 50});
  assert.equal(half.filter.volume, 46);
  const hat = FACTORY_PRESETS.find((p) => p.id === 'closed-noise-hat');
  const hatLane = {...defaultDrumKit().lanes.ch, level: 50};
  const {voice: hatVoice} = drumLaneTimbre(hat.settings, hatLane);
  assert.ok(hatVoice.decay < 0.022);
});

test('drumBpm respects sync and local tempo', () => {
  const seq = {sync: true, localBpm: 90};
  assert.equal(drumBpm(seq, 120), 120);
  assert.equal(drumBpm({...seq, sync: false}, 120), 90);
});

test('drumBusVolumeForLane scales engine bus volume by lane level', () => {
  const lane = defaultDrumKit().lanes.kick;
  assert.equal(drumLaneLevelGain(lane), 1);
  assert.equal(drumBusVolumeForLane({volume: 80}, lane, 'kick'), 88);
  assert.equal(
    drumBusVolumeForLane({volume: 80}, {...defaultDrumKit().lanes.sn, level: 100}, 'sn'),
    80,
  );
  assert.equal(drumBusVolumeForLane({volume: 80}, {...lane, level: 50}, 'kick'), 44);
  assert.equal(drumBusVolumeForLane({volume: 80}, {...lane, level: 0}, 'kick'), 0);
});

test('drumReleaseMilliseconds is positive for factory kick', () => {
  const kick = FACTORY_PRESETS.find((p) => p.id === 'low-thud-kick');
  const ms = drumReleaseMilliseconds(kick.settings.sound.engines[0].voice);
  assert.ok(ms >= 80);
});

test('closed hat gate ends before the next 1/16 at 120 BPM', () => {
  const hat = FACTORY_PRESETS.find((p) => p.id === 'closed-noise-hat');
  const ms = drumReleaseMilliseconds(hat.settings.sound.engines[0].voice);
  assert.ok(ms < 125);
  assert.ok(ms >= 40);
});