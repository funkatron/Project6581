#!/usr/bin/env node
/**
 * Node CLI wrapper around the browser-independent SID Instrument Lab modules.
 * Usage: node scripts/sid-lab.mjs inspect tune.sid [--json]
 *        node scripts/sid-lab.mjs analyze events.json [--json]
 *        node scripts/sid-lab.mjs notes events.json [--json]
 *        node scripts/sid-lab.mjs capture tune.sid --backend /path/to/trace-producer [--subtune N] [--json]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseSidHeader } from '../src/features/sid-instrument-lab/parse-sid-header.js';
import { analyzeSidRegisterEvents } from '../src/features/sid-instrument-lab/analyze-register-events.js';
import { extractSidNoteCandidates } from '../src/features/sid-instrument-lab/extract-note-candidates.js';
import { captureSidRegisters } from '../src/features/sid-instrument-lab/capture-sid-registers.js';
import { createProcessSidBackend } from './sid-lab-process-backend.mjs';
import { renderSidTraceWav } from '../src/features/sid-instrument-lab/render-trace-wav.js';

export async function runSidLab(args, { read = readFile, write = console.log, save = writeFile, backendFactory = createProcessSidBackend, wavRenderer = renderSidTraceWav } = {}) {
  const [command, filename, ...options] = args;
  const usage = 'Usage: sid-lab <inspect SID_FILE | analyze EVENTS_JSON | notes EVENTS_JSON> [--json] | capture SID_FILE --backend EXECUTABLE [--subtune N] [--json] | wav EVENTS_JSON --out FILE.wav [--wasm FILE.wasm] [--chip 0..2] [--voice 1..3]';
  if (!['inspect', 'analyze', 'notes', 'capture', 'wav'].includes(command) || !filename) throw new Error(usage);
  let backendPath;
  let subtune;
  let wavOptions;
  if (command === 'capture') {
    for (let i = 0; i < options.length; i++) {
      if (options[i] === '--json') continue;
      if (options[i] === '--backend' && options[i + 1]) backendPath = options[++i];
      else if (options[i] === '--subtune' && options[i + 1]) {
        const value = options[++i];
        if (!/^[0-9]+$/.test(value)) throw new Error(usage);
        subtune = Number(value);
      } else throw new Error(usage);
    }
    if (!backendPath) throw new Error(usage);
  } else if (command === 'wav') {
    wavOptions = { wasm: 'dist/residfp.wasm', chip: 0, voice: null };
    for (let i = 0; i < options.length; i++) {
      const flag = options[i];
      if (!['--out', '--wasm', '--chip', '--voice'].includes(flag) || !options[i + 1]) throw new Error(usage);
      const value = options[++i];
      if (flag === '--out') wavOptions.out = value;
      else if (flag === '--wasm') wavOptions.wasm = value;
      else {
        if (!/^[0-9]+$/.test(value)) throw new Error(usage);
        wavOptions[flag.slice(2)] = Number(value);
      }
    }
    if (!wavOptions.out || !/^[0-2]$/.test(String(wavOptions.chip)) ||
        (wavOptions.voice !== null && !/^[1-3]$/.test(String(wavOptions.voice)))) throw new Error(usage);
  } else if (options.some(option => option !== '--json')) throw new Error(usage);
  const bytes = await read(filename);
  let result;
  if (command === 'inspect') {
    result = parseSidHeader(bytes);
  } else if (command === 'capture') {
    result = await captureSidRegisters(backendFactory(backendPath), bytes, { subtune });
  } else if (command === 'wav') {
    const trace = JSON.parse(new TextDecoder().decode(bytes));
    const events = Array.isArray(trace) ? trace : trace?.events;
    const wasm = await read(wavOptions.wasm);
    result = await wavRenderer(wasm, events, { chip: wavOptions.chip, voice: wavOptions.voice, endCycle: trace?.maxCycles });
    await save(wavOptions.out, result.wav);
    write(`Wrote ${wavOptions.out} (${result.frames} frames at ${result.sampleRate} Hz)`);
    return result;
  } else {
    const input = JSON.parse(new TextDecoder().decode(bytes));
    const events = Array.isArray(input) ? input : input?.events;
    result = command === 'notes' ? extractSidNoteCandidates(events) : analyzeSidRegisterEvents(events);
  }
  if (options.includes('--json')) {
    write(JSON.stringify(result, null, 2));
  } else if (command === 'inspect') {
    write([
      `Title: ${result.title || '(untitled)'}`,
      `Author: ${result.author || '(unknown)'}`,
      `Released: ${result.released || '(unknown)'}`,
      `Format: ${result.format} v${result.version}`,
      `Subtunes: ${result.songs} (default ${result.startSong})`,
      `Load: $${result.loadAddress.toString(16).padStart(4, '0')}`,
      `Init: $${result.initAddress.toString(16).padStart(4, '0')}`,
      `Play: $${result.playAddress.toString(16).padStart(4, '0')}`,
    ].join('\n'));
  } else if (command === 'capture') {
    write(`Captured ${result.events.length} register events for subtune ${result.source.subtune}; use --json to export the trace`);
  } else if (command === 'notes') {
    write([
      `Candidate notes: ${result.notes.length}`,
      ...result.notes.map(n => `SID ${n.chip + 1}, voice ${n.voice}: ${n.startCycle}..${n.endCycle}${n.incomplete ? ' (incomplete)' : ''}`),
      `Chips with filter writes: ${result.chipFilterEvents.length}`,
    ].join('\n'));
  } else {
    write([
      `Register events: ${result.eventCount}`,
      `Active voices: ${result.voices.length}`,
      ...result.voices.map(v =>
        `SID ${v.chip + 1}, voice ${v.voice}: ${v.noteOns.length} gate-ons, ${v.noteOffs.length} gate-offs, ${v.waveformChanges.length} waveform changes`),
      `Chips with filter writes: ${result.filters.length}`,
    ].join('\n'));
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSidLab(process.argv.slice(2)).catch(error => {
    console.error(`SID Lab: ${error.message}`);
    process.exitCode = 1;
  });
}
