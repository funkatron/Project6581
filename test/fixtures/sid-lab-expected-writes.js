/**
 * Expected SID bus writes from the original PSID fixture's init routine.
 * These are assertions for a future instrumented 6510 backend, NOT captured
 * emulator output. Order is significant even for equal-cycle writes.
 */
export const SID_LAB_TONE_EXPECTED_WRITES = Object.freeze([
  { address: 0xd418, register: 24, value: 0x0f },
  { address: 0xd400, register: 0, value: 0x00 },
  { address: 0xd401, register: 1, value: 0x20 },
  { address: 0xd405, register: 5, value: 0x09 },
  { address: 0xd406, register: 6, value: 0xf0 },
  { address: 0xd404, register: 4, value: 0x21 },
]);

/**
 * Check an emulator's captured trace against the fixture's expected writes.
 * Extra writes (such as player setup) are permitted. Matching must preserve
 * the original sequence; repeated or missing writes are not silently repaired.
 */
export function assertToneFixtureWrites(events) {
  if (!Array.isArray(events)) throw new TypeError('Expected captured event array');
  let next = 0;
  for (const event of events) {
    const expected = SID_LAB_TONE_EXPECTED_WRITES[next];
    if (!expected) break;
    if (event?.chip === 0 && event.register === expected.register &&
        event.value === expected.value) next++;
  }
  if (next !== SID_LAB_TONE_EXPECTED_WRITES.length) {
    throw new Error(`Incomplete original tone fixture SID write sequence: ${next}/${SID_LAB_TONE_EXPECTED_WRITES.length}`);
  }
  return true;
}
