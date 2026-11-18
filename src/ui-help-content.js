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
 meters:{title:'Level meters',bullets:['Header: mixed output.','SID cards: per-chip bus level.']},
 'generator-led-drum':{title:'Drum generator LED',relatedTab:'drum',focusId:'tabDrum',bullets:['Lit when the drum sequencer preview is running; shows drum rate when on.','Tap: start or stop drum transport only — does not enable Root or Game arps. Long-press: help.']},
 'drum-seq':{title:'Drum step sequencer',relatedTab:'drum',focusId:'drumPanel',bullets:['Six lanes × 16 steps. Tap a cell for a hit or rest.','Preview runs the drum clock independently of keyboard arps.']},
 'generator-led-root':{title:'Root generator LED',relatedTab:'play',focusId:'rootArpTitle',bullets:['Lit when Root Arp is enabled; shows root rate when on.','Tap: enable or disable Root Arp. Long-press: help.']},
 'generator-led-game':{title:'Game generator LED',relatedTab:'play',focusId:'gameArpTitle',bullets:['Lit when Game Arp is enabled; shows pattern rate when on.','Tap: enable or disable Game Arp. Long-press: help.']},
 'generator-led-latch':{title:'Latch LED',relatedTab:'play',focusId:'arpLatch',bullets:['Lit when latch is on.','Tap: enable or disable latch. Long-press: help.']}
};