import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const wasmPath=new URL('../dist/residfp.wasm',import.meta.url);

test('dist/residfp.wasm exports per-chip metering and panning',t=>{
 if(!existsSync(wasmPath)){
  t.skip('dist/residfp.wasm not built (run scripts/build-residfp.sh with Emscripten)');
  return;
 }
 const bytes=readFileSync(wasmPath);
 const mod=new WebAssembly.Module(bytes);
 const names=WebAssembly.Module.exports(mod).map(entry=>entry.name);
 const required=['sid_chip_peaks_ptr','sid_set_pan','sid_set_chip_model','sid_set_chip_gain'];
 const missing=required.filter(symbol=>!names.includes(symbol));
 if(missing.length){
  const strict=process.env.CI==='true'||process.env.SID_REQUIRE_WASM_EXPORTS==='1';
  if(strict){
   assert.fail(`dist/residfp.wasm is stale; missing ${missing.join(', ')} (rebuild with npm run build:wasm)`);
  }
  t.skip(`dist/residfp.wasm missing ${missing.join(', ')} — run npm run build:wasm for per-chip meters`);
  return;
 }
 assert.ok(true);
});