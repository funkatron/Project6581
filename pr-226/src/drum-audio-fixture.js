import {defaultDrumSequence, validateDrumSequence} from './drum-step-sequencer.js?v=0.30.0+20261128T010628315Z';

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