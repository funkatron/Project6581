// Minimal DOM stand-in for mounting UI modules under node:test without a browser.

export function fakeElement(props={}){
 const listeners=new Map();
 const el={
  value:'',checked:false,textContent:'',hidden:false,disabled:false,
  dataset:{},children:[],attributes:{},selectedOptions:[],
  classList:{
   set:new Set(),
   add(name){this.set.add(name)},remove(name){this.set.delete(name)},
   contains(name){return this.set.has(name)}
  },
  addEventListener(type,fn){(listeners.get(type)??listeners.set(type,[]).get(type)).push(fn)},
  dispatch(type){for(const fn of listeners.get(type)??[])fn({type,currentTarget:el,target:el})},
  setAttribute(name,value){el.attributes[name]=String(value)},
  getAttribute(name){return el.attributes[name]??null},
  removeAttribute(name){delete el.attributes[name]},
  append(...nodes){el.children.push(...nodes)},
  replaceChildren(...nodes){el.children=nodes.flatMap(node=>node.isFragment?node.children:[node])},
  ...props
 };
 return el;
}

/** `$` that creates elements on first lookup; `initial` seeds id → props. */
export function fakeDom(initial={}){
 const elements=new Map();
 const $=id=>{
  if(!elements.has(id))elements.set(id,fakeElement(initial[id]));
  return elements.get(id);
 };
 return {$,elements};
}

/** Installs a global `document` with the factory methods UI modules use. */
export function installFakeDocument(){
 const previous=globalThis.document;
 globalThis.document={
  createElement:()=>fakeElement(),
  createDocumentFragment:()=>fakeElement({isFragment:true}),
  querySelector:()=>null
 };
 return ()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous};
}

/** Records setInterval / setTimeout delays without running real timers. */
export function recordTimers(){
 const saved={setInterval,clearInterval,setTimeout,clearTimeout};
 const intervals=[],timeouts=[];
 let id=0;
 globalThis.setInterval=(fn,ms)=>{intervals.push({fn,ms});return ++id};
 globalThis.setTimeout=(fn,ms)=>{timeouts.push({fn,ms});return ++id};
 globalThis.clearInterval=()=>{};
 globalThis.clearTimeout=()=>{};
 return {intervals,timeouts,restore:()=>Object.assign(globalThis,saved)};
}
