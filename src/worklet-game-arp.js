import {resolveGameRoot,selectRoot} from './arp-composition.js?v=__BUILD_ID__';
import {arpStep,gameStep} from './sequencer-steps.js?v=__BUILD_ID__';

// Step G1 (Game Arp in the worklet): the Game Arp, and the Root Arp's root
// picking while the Game Arp is on, as frame-clocked state for the AudioWorklet.
//
// It makes the same decisions, in the same order, as the page's
// performance-play.js gameTick() / arpTick() / gameStop():
//   - Root step (Game Arp on): arpStep() picks the root silently; transport
//     arp.gameTrigger decides whether the phrase restarts on it (G4) or the Game
//     Arp takes it on a phrase boundary.
//   - Game step: resolveGameRoot() (Root Arp root, else the last held note, else
//     the preview root); no root stops the Game Arp. Otherwise gameStep(): note-off
//     for the last note, note-on (or a rest), and a gate-off after
//     `duration` percent of the step, counted in frames.
// When a Root step and a Game step fall on the same frame, the Root step goes
// first (the page's fake-clock order today, and the order Step G4 relies on).
//
// Output events are {type:'on'|'off', note, source:'game', frame}: what the page
// passes to play()/stop(). Routing to chips stays with the note controller (G2).
// Nothing calls this from the worklet yet; playback is unchanged.

export function createWorkletGameArp({sampleRate}){
 if(!(sampleRate>0))throw new RangeError('sample rate');
 let game={step:0,last:null};
 let root={step:0,root:null,last:null};
 let gate=null;// {note, at, step}

 const offAt=(note,frame)=>({type:'off',note,source:'game',frame});
 function stopGame(frame){
  gate=null;
  if(game.last===null)return [];
  const events=[offAt(game.last,frame)];
  game={...game,last:null};
  return events;
 }

 return {
  /** Both clocks back to step 0 (the page's restartGenerators). */
  reset(){game={step:0,last:null};root={step:0,root:null,last:null};gate=null},
  get gameClock(){return {...game}},
  get rootClock(){return {...root}},
  /**
   * One Root Arp step while the Game Arp is on: picks the root, sounds nothing.
   * notes: the Root Arp's sorted notes (scale-resolved); pattern: transport.arp.pattern.
   * Returns {note|null, status} for the key highlight and status line.
   */
  rootStep({notes,pattern,phraseLength,gameTrigger,resolve}){
   const result=arpStep(root,{notes,pattern,gameOn:true,gameStep:game.step,phraseLength,gameTrigger,resolve});
   root=result.clock;
   // G4: the phrase restarts on this root (the Game step on this frame comes after).
   if(result.retrigger)game={...game,step:0};
   return {note:result.highlight.root??null,highlight:result.highlight,status:result.status};
  },
  /**
   * The page's keyUp() while the Root Arp runs unlatched: releasing the key that
   * is the current root picks the root again from the notes still held (no note).
   */
  releaseRoot(note,{notes,pattern}){
   if(root.root!==note)return;
   root={...root,root:notes.length?selectRoot(notes,pattern,root.step):null};
  },
  /**
   * One Game Arp step at `frame`. stepFrames: one Game step in frames (for the gate).
   * arpEnabled/seqPreview/previewRootMidi/heldNotes: as the page's gameRoot().
   * Returns {stop, events, stepIndex, highlight, status, gateAt}.
   */
  gameStep({frame,stepFrames,arpEnabled,heldNotes,seqPreview,previewRootMidi,sequence,resolve}){
   const rootNote=resolveGameRoot({arpEnabled,arpRoot:root.root,heldNotes,seqPreview,previewRootMidi});
   if(rootNote===null)return {stop:true,events:stopGame(frame),highlight:{game:null},status:{type:'idle'}};
   gate=null;
   const result=gameStep({step:game.step,last:game.last},{root:rootNote,sequence,resolve});
   game=result.clock;
   const events=result.events.map(event=>({...event,frame}));
   let gateAt=null;
   if(result.gate){
    gateAt=frame+Math.round(stepFrames*result.gate.fraction);
    gate={note:result.gate.note,at:gateAt,step:game.step};
   }
   return {stop:false,events,stepIndex:result.stepIndex,highlight:result.highlight,status:result.status,gateAt};
  },
  /** The gate-off due at or before `frame`, if any (the page's gate timer). */
  releaseDue(frame){
   if(!gate||gate.at>frame)return [];
   const {note,at,step}=gate;
   gate=null;
   // Same guard as the page: a later step or another note means this gate is stale.
   if(game.step!==step||game.last!==note)return [];
   game={...game,last:null};
   return [offAt(note,at)];
  },
  /**
   * Steps a clock skipped to stay on the grid (the page's `arp.step += skipped`,
   * `game.step += skipped`). Only the counters move; nothing sounds.
   */
  skip({root:rootSteps=0,game:gameSteps=0}={}){
   if(rootSteps>0)root={...root,step:root.step+rootSteps};
   if(gameSteps>0)game={...game,step:game.step+gameSteps};
  },
  /** The frame of the pending gate-off, or null. */
  nextGateAt(){return gate?.at??null},
  /** Note-off for the sounding Game Arp note (the page's gameStop). */
  stop(frame){return stopGame(frame)}
 };
}
