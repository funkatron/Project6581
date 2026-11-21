/**
 * Node-only adapter for a separately installed SID trace producer.
 *
 * Protocol: write a JSON request to stdin and receive a JSON object
 * { events: [{cycle, chip, register, value}, ...] } on stdout.
 * The producer must execute the SID player; this adapter does not emulate it.
 * Do not point this at an untrusted executable.
 */
import { spawn } from 'node:child_process';

export function createProcessSidBackend(executable, {
  args = [], timeoutMs = 15_000, maxOutputBytes = 32 * 1024 * 1024,
} = {}) {
  if (typeof executable !== 'string' || !executable.trim() ||
      !Array.isArray(args) || args.some(arg => typeof arg !== 'string')) {
    throw new TypeError('Expected executable path and string arguments');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000 ||
      !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 64 * 1024 * 1024) {
    throw new RangeError('Invalid process limits');
  }
  return {
    capture({ sidBytes, subtune, maxCycles, maxEvents, signal }) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason ?? new Error('Capture aborted'));
        const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false, signal });
        const chunks = [];
        let size = 0;
        let finished = false;
        const timer = setTimeout(() => fail(new Error('SID backend timed out')), timeoutMs);
        function settle(error, value) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (error) reject(error);
          else resolve(value);
        }
        function fail(error) {
          if (finished) return;
          child.kill('SIGKILL');
          settle(error);
        }
        child.on('error', error => settle(error));
        child.stdout.on('data', chunk => {
          size += chunk.length;
          if (size > maxOutputBytes) return fail(new RangeError('SID backend output limit exceeded'));
          chunks.push(chunk);
        });
        child.stderr.on('data', () => {}); // drain diagnostic output
        child.on('close', code => {
          if (finished) return;
          if (code !== 0) return settle(new Error(`SID backend exited with code ${code}`));
          try {
            settle(null, JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch {
            settle(new Error('SID backend returned invalid JSON'));
          }
        });
        child.stdin.on('error', error => fail(error));
        const request = JSON.stringify({
          schemaVersion: 1, subtune, maxCycles, maxEvents,
          sidBase64: Buffer.from(sidBytes).toString('base64'),
        });
        child.stdin.end(request);
      });
    },
  };
}
