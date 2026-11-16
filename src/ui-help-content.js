/** @type {Record<string,{title:string,bullets:string[],relatedTab?:string,focusId?:string}>} */
export const HELP_CONTENT={
 'play-target-keyboard':{title:'Keyboard play target',relatedTab:'voice',focusId:'keyboardRoute',bullets:['Choose which SID engine receives keyboard notes.','All (shared): one voice pool.','Layer: one key triggers all three chips—tune each card, then pick Layer.']},
 'play-target-arp-root':{title:'Root Arp target',relatedTab:'play',focusId:'arpRoute',bullets:['Root Arp notes route here or to a layer preset.']},
 'play-target-arp-game':{title:'Game Arp target',relatedTab:'play',focusId:'gameRoute',bullets:['Game Arp melody uses this routing.']},
 latch:{title:'Latch',relatedTab:'play',focusId:'arpLatch',bullets:['Held notes stay for Root and Game arpeggiators.', 'Clear latch removes latched notes.']},
 'root-arp':{title:'Root arpeggiator',relatedTab:'play',focusId:'rootArpTitle',bullets:['Cycles held notes in pattern order.','Picks the root for Game Arp.','Teal keys show root steps.']},
 'game-arp':{title:'Game Arp step sequencer',relatedTab:'play',focusId:'gameArpTitle',bullets:['Built-in phrases or custom steps.','Preview at the current octave.']},
 'game-arp-steps':{title:'Step lanes',relatedTab:'play',focusId:'seqGrid',bullets:['NOTE: pitch offset.','GATE: rest or play.','LENGTH: step duration %.']},
 'voice-allocation':{title:'Voice allocation',relatedTab:'voice',focusId:'voiceAssign',bullets:['Assign mode, voice count, unison, detune.','Up to nine oscillators across three chips.']},
 keyboard:{title:'Keyboard',relatedTab:'voice',focusId:'keyboardPanel',bullets:['Octave controls shift range.','LEDs show generator state (after P8).']},
 'pitch-envelope':{title:'Pitch envelope',relatedTab:'voice',bullets:['Pitch glide per voice while held.','Drag points or use templates.']},
 meters:{title:'Level meters',bullets:['Header: mixed output.','SID cards: per-chip bus level.']}
};