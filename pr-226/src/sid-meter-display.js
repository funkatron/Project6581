/**
 * Logarithmic rainbow meter mapping for per-chip peaks from WASM (0–1 normalized).
 * reSIDfp per-chip peaks are often ~0.05–0.25; linear gain left “loud” notes mid-scale.
 */
const DB = (level) => 20 * Math.log10(level);

/** ~−42 dBFS: meter bottom (idle / very quiet). */
export const METER_LOG_FLOOR = 0.008;

/** ~−18 dBFS: per-chip strip calibration (WASM chip peaks). */
export const METER_LOG_REFERENCE = 0.13;

/** Master PCM peaks ~0.04–0.12; reference above typical mix so the bar keeps headroom. */
export const METER_LOG_REFERENCE_MASTER = 0.072;
export const METER_MASTER_INPUT_GAIN = 1.05;

const DB_FLOOR = DB(METER_LOG_FLOOR);
const DB_REFERENCE = DB(METER_LOG_REFERENCE);
const DB_SPAN = DB_REFERENCE - DB_FLOOR;
const DB_REFERENCE_MASTER = DB(METER_LOG_REFERENCE_MASTER);
const DB_SPAN_MASTER = DB_REFERENCE_MASTER - DB_FLOOR;

function logMeterFraction(level, reference, dbSpan) {
 const clamped = Math.max(METER_LOG_FLOOR, Math.min(1, Number(level) || 0));
 if (clamped <= METER_LOG_FLOOR) return 0;
 if (clamped >= reference) return 1;
 const db = DB(clamped);
 return Math.max(0, Math.min(1, (db - DB_FLOOR) / dbSpan));
}

/** @param {number} level Normalized peak 0–1 */
export function meterDisplayFraction(level) {
 return logMeterFraction(level, METER_LOG_REFERENCE, DB_SPAN);
}

/** Header master loudness from mixed PCM (hotter mapping than chip telemetry). */
export function meterDisplayMasterFraction(level) {
 const boosted = Math.min(1, Math.max(0, Number(level) || 0) * METER_MASTER_INPUT_GAIN);
 return logMeterFraction(boosted, METER_LOG_REFERENCE_MASTER, DB_SPAN_MASTER);
}

export function meterDisplayHeight(level) {
 return `${(meterDisplayFraction(level) * 100).toFixed(1)}%`;
}

export function meterDisplayWidth(level) {
 return meterDisplayHeight(level);
}

/** Split a mono chip peak (post-pan bus telemetry) into L/R for meter display. */
export function chipPanStereoPeaks(monoPeak, panPercent) {
 const peak = Math.max(0, Number(monoPeak) || 0);
 const clamped = Math.max(-1, Math.min(1, (Number(panPercent) || 0) / 100));
 const angle = (clamped + 1) * 0.25 * Math.PI;
 const leftGain = Math.cos(angle);
 const rightGain = Math.sin(angle);
 const dominant = Math.max(leftGain, rightGain, 1e-6);
 const scale = peak / dominant;
 return {left: scale * leftGain, right: scale * rightGain};
}

export function meterDisplayMasterWidth(level) {
 return `${(meterDisplayMasterFraction(level) * 100).toFixed(1)}%`;
}