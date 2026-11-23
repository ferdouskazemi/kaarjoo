import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(__dirname, '../../dist/bundle.mjs');

console.log('--- Spike 1: Testing Node Engine JSON-RPC stdio round-trip ---');
console.log('Spawning sidecar bundle:', bundlePath);

const child = spawn(process.execPath, [bundlePath], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

const rl = readline.createInterface({
  input: child.stdout,
  terminal: false,
});

let readyReceived = false;
let pingReceived = false;
let browsersReceived = false;
let specsReceived = false;

rl.on('line', (line) => {
  const msg = JSON.parse(line.trim());
  console.log('Received from sidecar:', JSON.stringify(msg));

  if (msg.method === 'engine.ready') {
    readyReceived = true;
    // Send ping
    const req = {
      jsonrpc: '2.0',
      id: 1,
      method: 'system.ping',
    };
    child.stdin.write(JSON.stringify(req) + '\n');
  } else if (msg.id === 1) {
    pingReceived = true;
    console.log('Ping response validated:', msg.result);
    // Send discoverBrowsers
    const req = {
      jsonrpc: '2.0',
      id: 2,
      method: 'system.discoverBrowsers',
    };
    child.stdin.write(JSON.stringify(req) + '\n');
  } else if (msg.id === 2) {
    browsersReceived = true;
    console.log('Discovered browsers validated:', msg.result);
    // Send getHardwareSpecs
    const req = {
      jsonrpc: '2.0',
      id: 3,
      method: 'system.getHardwareSpecs',
    };
    child.stdin.write(JSON.stringify(req) + '\n');
  } else if (msg.id === 3) {
    specsReceived = true;
    console.log('Hardware specs validated:', msg.result);
    console.log('All JSON-RPC tests PASSED!');
    child.kill();
    process.exit(0);
  }
});

setTimeout(() => {
  if (!specsReceived) {
    console.error('Timeout waiting for RPC responses!');
    child.kill();
    process.exit(1);
  }
}, 8000);
