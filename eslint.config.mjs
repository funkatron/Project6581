// Bug-finding rules only; no style rules. Formatting (Prettier) is deferred until
// tests stop matching exact source text (review finding 3).
// Core rules only, so CI needs nothing beyond the eslint package itself.
const browser=['window','document','navigator','location','performance','console','setTimeout','clearTimeout',
 'setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','queueMicrotask','structuredClone',
 'AudioContext','AudioWorkletNode','OfflineAudioContext','MediaRecorder','MediaStream','Blob','File','FileReader',
 'URL','URLSearchParams','fetch','AbortController','Response','Request','Headers','WebAssembly','TextEncoder',
 'TextDecoder','HTMLElement','Element','Node','Event','CustomEvent','KeyboardEvent','PointerEvent','DOMParser',
 'MutationObserver','ResizeObserver','IntersectionObserver','getComputedStyle','matchMedia','localStorage',
 'sessionStorage','crypto','alert','confirm','prompt','globalThis','self','btoa','atob','Image','CSS','Intl',
 'DataView','ArrayBuffer','SharedArrayBuffer','Float32Array','Int16Array','Uint8Array','Int32Array','Uint32Array',
 'Float64Array','Uint16Array','Int8Array','Map','Set','WeakMap','WeakSet','Promise','Symbol','Proxy','Reflect','BigInt'];
const worklet=['AudioWorkletProcessor','registerProcessor','sampleRate','currentFrame','currentTime','port'];
const node=['process','Buffer','__dirname','__filename','global'];
const globals=names=>Object.fromEntries(names.map(name=>[name,'readonly']));
const rules={
 'no-undef':'error','no-unused-vars':['error',{args:'none',caughtErrors:'none',varsIgnorePattern:'^_'}],
 'no-dupe-keys':'error','no-dupe-args':'error','no-duplicate-case':'error','no-unreachable':'error',
 'no-self-assign':'error','no-self-compare':'error','no-redeclare':'error','no-const-assign':'error',
 'no-func-assign':'error','no-import-assign':'error','no-cond-assign':['error','except-parens'],
 'no-constant-condition':['error',{checkLoops:false}],'no-unsafe-finally':'error','no-unsafe-negation':'error',
 'no-sparse-arrays':'error','no-compare-neg-zero':'error','use-isnan':'error','valid-typeof':'error',
 'no-loss-of-precision':'error','no-dupe-else-if':'error','no-fallthrough':'error','no-unused-labels':'error',
};
export default [
 {ignores:['dist/**','node_modules/**','tmp/**','docs/**']},
 {files:['src/**/*.js'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:globals(browser)},rules},
 {files:['src/residfp-worklet.js','src/sid-audio-worklet.js'],languageOptions:{sourceType:'script',globals:globals([...browser,...worklet])}},
 {files:['test/**/*.{js,mjs}','scripts/**/*.mjs'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:globals([...browser,...node])},rules},
];
