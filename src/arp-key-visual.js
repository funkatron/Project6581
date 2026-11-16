// DOM-only presentation state for arpeggiator notes. Physical key presses use
// a separate CSS class; this never sends SID register writes or schedules audio.
const SOURCES = Object.freeze(['root', 'game']);
const SOURCE_CLASS = Object.freeze({root: 'arp-playing-root', game: 'arp-playing-game'});

export function createArpKeyVisual({getKey}) {
 /** @type {Record<'root'|'game', {note: number|null, key: Element|null}>} */
 const slots = {root: {note: null, key: null}, game: {note: null, key: null}};

 function applySource(source) {
  const slot = slots[source];
  const className = SOURCE_CLASS[source];
  slot.key?.classList.remove(className);
  slot.key = null;
  if (slot.note === null) return;
  const key = getKey(slot.note);
  if (key) {
   key.classList.add(className);
   slot.key = key;
  }
 }

 function refresh() {
  for (const source of SOURCES) applySource(source);
 }

 return {
  show(nextNote, nextSource) {
   if (!Number.isInteger(nextNote) || nextNote < 0 || nextNote > 127) {
    throw new RangeError('Expected a MIDI note from 0 to 127');
   }
   if (nextSource !== 'root' && nextSource !== 'game') {
    throw new TypeError('Expected arp visual source "root" or "game"');
   }
   const slot = slots[nextSource];
   // Avoid repainting the same key on fast or repeated arp steps.
   if (slot.note === nextNote && slot.key === (getKey(nextNote) ?? null)) return;
   slot.note = nextNote;
   applySource(nextSource);
  },
  clear(source) {
   if (source === undefined) {
    let changed = false;
    for (const name of SOURCES) {
     if (slots[name].note !== null || slots[name].key !== null) {
      slots[name].note = null;
      applySource(name);
      changed = true;
     }
    }
    if (!changed) return;
    return;
   }
   if (source !== 'root' && source !== 'game') {
    throw new TypeError('Expected arp visual source "root" or "game"');
   }
   if (slots[source].note === null && slots[source].key === null) return;
   slots[source].note = null;
   applySource(source);
  },
  refresh,
  getNote(source) {
   if (source !== 'root' && source !== 'game') return null;
   return slots[source].note;
  }
 };
}