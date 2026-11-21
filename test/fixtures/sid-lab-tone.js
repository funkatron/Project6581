/**
 * Tiny original PSID v2 fixture, generated in memory.
 *
 * The 6510 init routine sets volume, pitch, ADSR and gates voice 1.
 * The play routine simply returns. No copyrighted SID tunes or C64 ROMs.
 */
export function createSidLabToneFixture() {
  const program = [
    0xa9, 0x0f, 0x8d, 0x18, 0xd4, // LDA #15; STA $d418
    0xa9, 0x00, 0x8d, 0x00, 0xd4, // frequency low
    0xa9, 0x20, 0x8d, 0x01, 0xd4, // frequency high
    0xa9, 0x09, 0x8d, 0x05, 0xd4, // attack / decay
    0xa9, 0xf0, 0x8d, 0x06, 0xd4, // sustain / release
    0xa9, 0x21, 0x8d, 0x04, 0xd4, // saw + gate
    0x60, // init RTS
    0x60, // play RTS
  ];
  const bytes = new Uint8Array(0x7c + program.length);
  const view = new DataView(bytes.buffer);
  bytes.set([0x50, 0x53, 0x49, 0x44], 0); // PSID
  view.setUint16(4, 2); // version
  view.setUint16(6, 0x7c); // data offset
  view.setUint16(8, 0x1000); // load address
  view.setUint16(10, 0x1000); // init address
  view.setUint16(12, 0x101f); // play address, after init RTS
  view.setUint16(14, 1); // songs
  view.setUint16(16, 1); // start song
  const label = new TextEncoder().encode('Project6581 original test tone');
  bytes.set(label.subarray(0, 32), 22);
  bytes.set(program, 0x7c);
  return bytes;
}
