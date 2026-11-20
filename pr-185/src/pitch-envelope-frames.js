import {pitchOffsetAt,validatePitchEnvelope} from './pitch-envelope.js';

// Worklet-side scheduling geometry. The caller supplies the audio frame clock;
// no main-thread timers or performance.now() are involved.
export function startPitchEnvelope(envelope,baseNote,startFrame,sampleRate){
 const validated=validatePitchEnvelope(envelope);
 if(!Number.isFinite(baseNote))throw new RangeError('Invalid base note');
 if(!Number.isSafeInteger(startFrame)||startFrame<0)throw new RangeError('Invalid start frame');
 if(!Number.isFinite(sampleRate)||sampleRate<=0)throw new RangeError('Invalid sample rate');
 return {envelope:validated,baseNote,startFrame,sampleRate};
}

export function pitchNoteAtFrame(state,frame){
 if(!Number.isSafeInteger(frame)||frame<state.startFrame)throw new RangeError('Invalid audio frame');
 const elapsedMs=(frame-state.startFrame)*1000/state.sampleRate;
 return state.baseNote+pitchOffsetAt(state.envelope,elapsedMs);
}

export function sidFrequencyAtFrame(state,frame,clock=985248){
 if(!Number.isFinite(clock)||clock<=0)throw new RangeError('Invalid SID clock');
 const note=pitchNoteAtFrame(state,frame);
 const hz=440*2**((note-69)/12);
 return Math.max(0,Math.min(65535,Math.round(hz*16777216/clock)));
}
