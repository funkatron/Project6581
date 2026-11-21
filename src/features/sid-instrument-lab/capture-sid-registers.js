/**
 * Playback backend contract for SID Instrument Lab.
 *
 * A backend executes untrusted SID music in a separately isolated environment
 * and returns cycle-timestamped register writes. This adapter intentionally
 * does not assume any particular C64 emulator or SID audio renderer.
 */
import { parseSidHeader } from './parse-sid-header.js';
import { validateSidEvents } from './analyze-register-events.js';

export const MAX_SID_BYTES = 1024 * 1024;
export const MAX_CAPTURE_EVENTS = 1_000_000;

export async function captureSidRegisters(backend, sidBytes, {
  subtune, maxCycles = 9852480, signal,
} = {}) {
  if (!backend || typeof backend.capture !== 'function') {
    throw new TypeError('Playback backend must expose capture()');
  }
  if (!(sidBytes instanceof ArrayBuffer) && !ArrayBuffer.isView(sidBytes)) {
    throw new TypeError('Expected SID file bytes');
  }
  const bytes = sidBytes instanceof ArrayBuffer
    ? new Uint8Array(sidBytes)
    : new Uint8Array(sidBytes.buffer, sidBytes.byteOffset, sidBytes.byteLength);
  if (bytes.byteLength > MAX_SID_BYTES) throw new RangeError('SID file exceeds capture limit');
  const metadata = parseSidHeader(bytes);
  const selectedSubtune = subtune ?? metadata.startSong;
  if (!Number.isInteger(selectedSubtune) || selectedSubtune < 1 || selectedSubtune > metadata.songs) {
    throw new RangeError('Subtune out of range');
  }
  if (!Number.isSafeInteger(maxCycles) || maxCycles < 1 || maxCycles > 200_000_000) {
    throw new RangeError('Invalid cycle budget');
  }
  if (signal?.aborted) throw signal.reason ?? new Error('Capture aborted');
  const result = await backend.capture({
    sidBytes: bytes.slice(),
    metadata,
    subtune: selectedSubtune,
    maxCycles,
    maxEvents: MAX_CAPTURE_EVENTS,
    signal,
  });
  if (signal?.aborted) throw signal.reason ?? new Error('Capture aborted');
  if (!result || !Array.isArray(result.events) || result.events.length > MAX_CAPTURE_EVENTS) {
    throw new RangeError('Backend returned an invalid event trace');
  }
  const events = validateSidEvents(result.events);
  if (events.some(event => event.cycle > maxCycles)) {
    throw new RangeError('Backend exceeded the requested cycle budget');
  }
  return {
    schemaVersion: 1,
    source: { format: metadata.format, title: metadata.title, subtune: selectedSubtune },
    timebase: 'c64-cycles',
    maxCycles,
    events,
  };
}
