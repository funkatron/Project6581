import {defaultDrumSequence, validateDrumSequence} from './drum-step-sequencer.js?v=__BUILD_ID__';

/** Merge a drum-audio JSON fixture into a validated sequence object. */
export function drumSequenceFromFixture(fixture){
 if(!fixture?.sequence?.grid)throw new TypeError('Fixture missing sequence.grid');
 const base=defaultDrumSequence();
 return validateDrumSequence({
  ...base,
  ...fixture.sequence,
  grid:fixture.sequence.grid,
 });
}