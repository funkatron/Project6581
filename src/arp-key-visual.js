// DOM-only presentation state for arpeggiator notes. Physical key presses use
// a separate CSS class; this never sends SID register writes or schedules audio.
const SOURCE_CLASS = Object.freeze({root: 'arp-playing-root', game: 'arp-playing-game'});
const ALL_CLASSES = Object.values(SOURCE_CLASS);

export function createArpKeyVisual({getKey}) {
 let note = null;
 let source = null;
 let highlightedKey = null;

 function render() {
  highlightedKey?.classList.remove(...ALL_CLASSES);
  highlightedKey = null;
  if (note === null || source === null) return;
  const key = getKey(note);
  const className = SOURCE_CLASS[source];
  if (key && className) {
   key.classList.add(className);
   highlightedKey = key;
  }
 }

 return {
  show(nextNote, nextSource) {
   if (!Number.isInteger(nextNote) || nextNote < 0 || nextNote > 127) {
    throw new RangeError('Expected a MIDI note from 0 to 127');
   }
   if (nextSource !== 'root' && nextSource !== 'game') {
    throw new TypeError('Expected arp visual source "root" or "game"');
   }
   // Avoid repainting the same key on fast or repeated arp steps.
   if (note === nextNote && source === nextSource && highlightedKey === (getKey(nextNote) ?? null)) return;
   note = nextNote;
   source = nextSource;
   render();
  },
  clear() {
   if (note === null && highlightedKey === null) return;
   note = null;
   source = null;
   render();
  },
  refresh: render,
  get note() { return note; },
  get source() { return source; }
 };
}