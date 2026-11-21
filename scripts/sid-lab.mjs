#!/usr/bin/env node
/**
 * Node CLI wrapper around the browser-independent SID Instrument Lab modules.
 * Usage: node scripts/sid-lab.mjs inspect tune.sid [--json]
 *        node scripts/sid-lab.mjs analyze events.json [--json]
 *        node scripts/sid-lab.mjs notes events.json [--json]
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseSidHeader } from '../src/features/sid-instrument-lab/parse-sid-header.js';
import { analyzeSidRegisterEvents } from '../src/features/sid-instrument-lab/analyze-register-events.js';
import { extractSidNoteCandidates } from '../src/features/sid-instrument-lab/extract-note-candidates.js';

export async function runSidLab(args, { read = readFile, write = console.log } = {}) {
  const [command, filename, ...options] = args;
  if (!['inspect', 'analyze', 'notes'].includes(command) || !filename ||
      options.some(option => option !== '--json')) {
    throw new Error('Usage: sid-lab <inspect SID_FILE | analyze EVENTS_JSON | notes EVENTS_JSON> [--json]');
  }
  const bytes = await read(filename);
  let result;
  if (command === 'inspect') {
    result = parseSidHeader(bytes);
  } else {
    const input = JSON.parse(new TextDecoder().decode(bytes));
    result = command === 'notes' ? extractSidNoteCandidates(input) : analyzeSidRegisterEvents(input);
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
