// DOM-only presentation state for arpeggiator notes. Physical key presses use
// a separate CSS class; this never sends SID register writes or schedules audio.
export function createArpKeyVisual({getKey, noteName, showLabel}) {
 let note = null;
 let highlightedKey = null;

 function render() {
  highlightedKey?.classList.remove('arp-playing');
  highlightedKey = null;
  if (note === null) {
   showLabel('');
   return;
  }
  const key = getKey(note);
  if (key) {
   key.classList.add('arp-playing');
   highlightedKey = key;
  }
  showLabel(noteName(note) + (key ? '' : ' · outside keyboard'));
 }

 return {
  show(nextNote) {
   if (!Number.isInteger(nextNote) || nextNote < 0 || nextNote > 127) {
    throw new RangeError('Expected a MIDI note from 0 to 127');
   }
   // Avoid repainting the same key on fast or repeated arp steps.
   if (note === nextNote && highlightedKey === (getKey(nextNote) ?? null)) return;
   note = nextNote;
   render();
  },
  clear() {
   if (note === null && highlightedKey === null) return;
   note = null;
   render();
  },
  refresh: render,
  get note() { return note; }
 };
}
