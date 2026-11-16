/**
 * Logarithmic rainbow meter mapping for per-chip peaks from WASM (0–1 normalized).
 * reSIDfp per-chip peaks are often ~0.05–0.25; linear gain left “loud” notes mid-scale.
 */
const DB = (level) => 20 * Math.log10(level);

/** ~−42 dBFS: meter bottom (idle / very quiet). */
export const METER_LOG_FLOOR = 0.008;

/** ~−13 dBFS: calibrate typical loud SID activity near the top of the strip. */
export const METER_LOG_REFERENCE = 0.22;

const DB_FLOOR = DB(METER_LOG_FLOOR);
const DB_REFERENCE = DB(METER_LOG_REFERENCE);
const DB_SPAN = DB_REFERENCE - DB_FLOOR;

/** @param {number} level Normalized peak 0–1 */
export function meterDisplayFraction(level) {
 const clamped = Math.max(METER_LOG_FLOOR, Math.min(1, Number(level) || 0));
 if (clamped <= METER_LOG_FLOOR) return 0;
 if (clamped >= METER_LOG_REFERENCE) return 1;
 const db = DB(clamped);
 return Math.max(0, Math.min(1, (db - DB_FLOOR) / DB_SPAN));
}

export function meterDisplayHeight(level) {
 return `${(meterDisplayFraction(level) * 100).toFixed(1)}%`;
}

export function meterDisplayWidth(level) {
 return meterDisplayHeight(level);
}