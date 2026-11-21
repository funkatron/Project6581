/**
 * SID Instrument Lab: pure PSID/RSID header reader.
 *
 * This module intentionally does not execute embedded 6510 code. SID files
 * are programs, not audio recordings; playback requires a separate sandboxed
 * C64 player. Keep this parser independent of the live synth audio lifecycle.
 */
const decoder = new TextDecoder('latin1');
const HEADER_LENGTH = 0x76;
const V2_HEADER_LENGTH = 0x7c;
const MAX_SUBTUNES = 256;

function readString(bytes, offset) {
  const field = bytes.subarray(offset, offset + 32);
  const end = field.indexOf(0);
  return decoder.decode(end < 0 ? field : field.subarray(0, end)).trim();
}

export function parseSidHeader(input) {
  if (!(input instanceof ArrayBuffer) && !ArrayBuffer.isView(input)) {
    throw new TypeError('Expected SID file bytes');
  }
  const bytes = input instanceof ArrayBuffer
    ? new Uint8Array(input)
    : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.byteLength < HEADER_LENGTH) throw new RangeError('Truncated SID header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  if (magic !== 'PSID' && magic !== 'RSID') throw new Error('Not a PSID or RSID file');
  const version = view.getUint16(4, false);
  if (version < 1 || version > 4 || (magic === 'RSID' && version < 2)) {
    throw new Error('Unsupported SID header version');
  }
  const dataOffset = view.getUint16(6, false);
  const minimumOffset = version === 1 ? HEADER_LENGTH : V2_HEADER_LENGTH;
  if (dataOffset < minimumOffset || dataOffset >= bytes.byteLength ||\n      (version >= 3 && dataOffset < 0x7b) || (version >= 4 && dataOffset < 0x7c)) {
    throw new RangeError('Invalid SID data offset');
  }
  const declaredLoadAddress = view.getUint16(8, false);
  if (declaredLoadAddress === 0 && dataOffset + 2 > bytes.byteLength) {
    throw new RangeError('Missing embedded load address');
  }
  const loadAddress = declaredLoadAddress || view.getUint16(dataOffset, true);\n  if (magic === 'RSID' && (declaredLoadAddress !== 0 || view.getUint16(12, false) !== 0 ||\n      view.getUint32(18, false) !== 0)) {\n    throw new RangeError('Invalid RSID reserved fields');\n  }
  const songs = view.getUint16(14, false);
  const startSong = view.getUint16(16, false);
  if (songs < 1 || songs > MAX_SUBTUNES || startSong < 1 || startSong > songs) {
    throw new RangeError('Invalid SID subtune metadata');
  }
  const flags = version >= 2 ? view.getUint16(0x76, false) : 0;
  const sid2AddressByte = version >= 3 ? view.getUint8(0x7a) : 0;
  const sid3AddressByte = version >= 4 ? view.getUint8(0x7b) : 0;
  return Object.freeze({
    format: magic,
    version,
    title: readString(bytes, 0x16),
    author: readString(bytes, 0x36),
    released: readString(bytes, 0x56),
    songs,
    startSong,
    loadAddress,
    initAddress: view.getUint16(10, false),
    playAddress: view.getUint16(12, false),
    speedBits: view.getUint32(18, false),
    dataOffset,
    payloadOffset: dataOffset + (declaredLoadAddress === 0 ? 2 : 0),
    payloadLength: bytes.byteLength - dataOffset - (declaredLoadAddress === 0 ? 2 : 0),
    flags,
    sid2AddressByte,
    sid3AddressByte,
  });
}
