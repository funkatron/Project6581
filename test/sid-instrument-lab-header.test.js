import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSidHeader } from '../src/features/sid-instrument-lab/parse-sid-header.js';

function fixture({ magic = 'PSID', version = 2, songs = 3, startSong = 2, embeddedLoad = true } = {}) {
  const dataOffset = version === 1 ? 0x76 : 0x7c;
  const bytes = new Uint8Array(dataOffset + 5);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < 4; i++) bytes[i] = magic.charCodeAt(i);
  view.setUint16(4, version);
  view.setUint16(6, dataOffset);
  view.setUint16(8, embeddedLoad ? 0 : 0x1000);
  view.setUint16(10, 0x1003);
  view.setUint16(12, 0x1006);
  view.setUint16(14, songs);
  view.setUint16(16, startSong);
  view.setUint32(18, 0x80000001);
  bytes.set(new TextEncoder().encode('Commando'), 0x16);
  if (embeddedLoad) view.setUint16(dataOffset, 0x1000, true);
  return bytes;
}

test('parses PSID metadata, embedded load address, and subtunes', () => {
  const result = parseSidHeader(fixture());
  assert.equal(result.format, 'PSID');
  assert.equal(result.title, 'Commando');
  assert.equal(result.loadAddress, 0x1000);
  assert.equal(result.payloadOffset, 0x7e);
  assert.equal(result.payloadLength, 3);
  assert.equal(result.songs, 3);
  assert.equal(result.startSong, 2);
  assert.equal(result.speedBits, 0x80000001);
});

test('accepts RSID and explicit load address', () => {
  const result = parseSidHeader(fixture({ magic: 'RSID', embeddedLoad: false }));
  assert.equal(result.format, 'RSID');
  assert.equal(result.payloadOffset, 0x7c);
  assert.equal(result.loadAddress, 0x1000);
});

test('accepts byte views with nonzero offsets', () => {
  const sid = fixture();
  const container = new Uint8Array(sid.length + 8);
  container.set(sid, 4);
  assert.equal(parseSidHeader(container.subarray(4, 4 + sid.length)).title, 'Commando');
});

test('rejects unsupported and truncated input', () => {
  assert.throws(() => parseSidHeader('not bytes'), TypeError);
  assert.throws(() => parseSidHeader(new Uint8Array(8)), RangeError);
  assert.throws(() => parseSidHeader(fixture({ magic: 'WAVE' })), /Not a PSID/);
  assert.throws(() => parseSidHeader(fixture({ version: 5 })), /Unsupported/);
  assert.throws(() => parseSidHeader(fixture({ songs: 0 })), /subtune/);
  assert.throws(() => parseSidHeader(fixture({ startSong: 4 })), /subtune/);
  assert.throws(() => parseSidHeader(fixture({ magic: 'RSID', version: 1 })), /Unsupported/);
});

test('rejects offsets that point beyond the file', () => {
  const bytes = fixture();
  new DataView(bytes.buffer).setUint16(6, bytes.length);
  assert.throws(() => parseSidHeader(bytes), /offset/);
});
