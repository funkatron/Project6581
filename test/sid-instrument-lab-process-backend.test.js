import test from 'node:test';
import assert from 'node:assert/strict';
import { createProcessSidBackend } from '../scripts/sid-lab-process-backend.mjs';

test('process backend exchanges a JSON capture request and response', async () => {
  const script = `let data='';process.stdin.setEncoding('utf8');
process.stdin.on('data',x=>data+=x);
process.stdin.on('end',()=>{const request=JSON.parse(data);
if(request.sidBase64!=='AQID'||request.subtune!==2)process.exit(2);
process.stdout.write(JSON.stringify({events:[{cycle:4,chip:0,register:4,value:33}]}));});`;
  const backend = createProcessSidBackend(process.execPath, {
    args: ['-e', script], timeoutMs: 5000,
  });
  const result = await backend.capture({
    sidBytes: Uint8Array.from([1, 2, 3]), subtune: 2, maxCycles: 100, maxEvents: 10,
  });
  assert.equal(result.events[0].cycle, 4);
});

test('process backend rejects malformed output', async () => {
  const backend = createProcessSidBackend(process.execPath, {
    args: ['-e', 'process.stdout.write("not json")'], timeoutMs: 5000,
  });
  await assert.rejects(backend.capture({
    sidBytes: new Uint8Array(), subtune: 1, maxCycles: 100, maxEvents: 10,
  }), /invalid JSON/);
});

test('process backend limits stdout', async () => {
  const backend = createProcessSidBackend(process.execPath, {
    args: ['-e', 'process.stdout.write("x".repeat(5000))'],
    maxOutputBytes: 100, timeoutMs: 5000,
  });
  await assert.rejects(backend.capture({
    sidBytes: new Uint8Array(), subtune: 1, maxCycles: 100, maxEvents: 10,
  }), /output limit/);
});

test('process backend rejects invalid configuration', () => {
  assert.throws(() => createProcessSidBackend(''), TypeError);
  assert.throws(() => createProcessSidBackend('node', { timeoutMs: 0 }), RangeError);
});
