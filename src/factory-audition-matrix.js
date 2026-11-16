/** Step D: consistent audition phrases for the 24 core C64-inspired factory presets. */
export const SOUNDTRACK_TAGS=Object.freeze(['turrican','parallax','commando','original']);

/** @type {Record<string,{low:string,mid:string,high:string,inspiredBy:(typeof SOUNDTRACK_TAGS)[number],designNote:string}>} */
export const FACTORY_AUDITION_PHRASES=Object.freeze({
 'tight-pulse-bass':{low:'C2 staccato',mid:'G2 repeated',high:'C3 short',inspiredBy:'commando',designNote:'Short narrow pulse — Commando-style drive'},
 'pwm-drive-bass':{low:'C2 hold',mid:'F2 hold',high:'C3 pulse',inspiredBy:'commando',designNote:'Moving PWM texture under action bass'},
 'filtered-saw-bass':{low:'C2',mid:'F2',high:'C3',inspiredBy:'turrican',designNote:'Rounded saw low-end (Deep-style stack)'},
 'hollow-square-bass':{low:'C2 hold',mid:'G2',high:'C3',inspiredBy:'original',designNote:'Band-pass hollow pulse'},
 'octave-runner-bass':{low:'C2 hold (Game Arp)',mid:'E2',high:'—',inspiredBy:'turrican',designNote:'Discrete octave steps, not pitch sweep'},
 'warm-triangle-bass':{low:'C2',mid:'G2',high:'C3',inspiredBy:'original',designNote:'Gentle triangle bass'},
 'shimmer-pwm-keys':{low:'C3',mid:'E4',high:'G4',inspiredBy:'parallax',designNote:'Slow PWM pad shimmer'},
 'chip-pluck-keys':{low:'C4 repeats',mid:'E4',high:'G4',inspiredBy:'parallax',designNote:'Short pluck stabs'},
 'bell-keys':{low:'C4',mid:'C5',high:'G4',inspiredBy:'parallax',designNote:'Decaying bell-like triangle'},
 'chord-stab-keys':{low:'C4–E4–G4',mid:'F4–A4–C5',high:'—',inspiredBy:'parallax',designNote:'Poly chord stab'},
 'organ-keys':{low:'C3–E3–G3 hold',mid:'F3–A3–C4',high:'—',inspiredBy:'parallax',designNote:'Held organ-style squares'},
 'slow-glass-pad':{low:'C3–E3 hold',mid:'G3',high:'C4',inspiredBy:'parallax',designNote:'Slow opening pad + cutoff LFO'},
 'bright-pulse-lead':{low:'C4',mid:'G4',high:'C5',inspiredBy:'turrican',designNote:'Clear pulse lead hook'},
 'nasal-pwm-lead':{low:'C4 hold',mid:'G4',high:'—',inspiredBy:'turrican',designNote:'Resonant band-pass PWM'},
 'smooth-legato-lead':{low:'C4→E4 overlap',mid:'G4',high:'C5',inspiredBy:'original',designNote:'Legato triangle (no retrigger)'},
 'tremolo-pulse-lead':{low:'C4 hold',mid:'G4',high:'—',inspiredBy:'original',designNote:'Volume LFO tremolo, not vibrato'},
 'octave-chase-lead':{low:'C4 hold (Game Arp)',mid:'—',high:'C5',inspiredBy:'turrican',designNote:'Stepped octave pattern'},
 'filtered-saw-lead':{low:'C4',mid:'G4 hold',high:'C5',inspiredBy:'turrican',designNote:'Resonant moving cutoff'},
 'noise-snare':{low:'C3 rapid',mid:'C4 rapid',high:'C4',inspiredBy:'commando',designNote:'Short HP noise burst'},
 'low-thud-kick':{low:'C1/C2 repeat',mid:'C2',high:'—',inspiredBy:'commando',designNote:'Static thud — not pitch-swept kick'},
 'closed-noise-hat':{low:'—',mid:'C4 rapid',high:'C5 rapid',inspiredBy:'commando',designNote:'Very short HP noise'},
 'open-noise-hat':{low:'—',mid:'C4 spaced',high:'C5',inspiredBy:'commando',designNote:'Longer HP noise decay'},
 'noise-clap':{low:'—',mid:'C4 repeats',high:'—',inspiredBy:'commando',designNote:'Band-pass noise + volume LFO'},
 'low-tom':{low:'C2',mid:'G2',high:'—',inspiredBy:'commando',designNote:'Triangle tom body — no sweep yet'}
});

export const CORE_C64_INSPIRED_IDS=Object.freeze(Object.keys(FACTORY_AUDITION_PHRASES));