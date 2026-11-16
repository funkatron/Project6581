/** Scale reSIDfp chip peaks (~0.1–0.4 typical) into the rainbow meter track. */
export const METER_DISPLAY_GAIN=2.75;

export function meterDisplayHeight(level){
 const scaled=Math.max(0,Math.min(1,(Number(level)||0)*METER_DISPLAY_GAIN));
 return (scaled*100).toFixed(1)+'%';
}