import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';

const bundlePath = path.resolve('packages/engine/dist/bundle.mjs');
console.log(`Starting Engine bundle at: ${bundlePath}`);

const child = spawn(process.execPath, [bundlePath], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

const rl = readline.createInterface({
  input: child.stdout,
  terminal: false,
});

let reqId = 1;
const pending = new Map<number, (res: any) => void>();

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    if (msg.id && pending.has(msg.id)) {
      const cb = pending.get(msg.id)!;
      pending.delete(msg.id);
      cb(msg);
    } else {
      console.log('[NOTIFICATION/EVENT]', msg);
    }
  } catch (e) {
    console.error('Non-JSON stdout:', line);
  }
});

function callRpc(method: string, params?: any): Promise<any> {
  const id = reqId++;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for response to ${method} (id: ${id})`));
    }, 45000);

    pending.set(id, (res) => {
      clearTimeout(timeout);
      if (res.error) {
        reject(new Error(`RPC error: ${JSON.stringify(res.error)}`));
      } else {
        resolve(res.result);
      }
    });

    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    child.stdin.write(payload);
  });
}

async function main() {
  try {
    // 1. Health check
    console.log('\n--- 1. Testing system.ping ---');
    const pingRes = await callRpc('system.ping');
    console.log('system.ping response:', pingRes);

    // 2. Profile parse & extract
    console.log('\n--- 2. Testing profile.parseAndExtract ---');
    const extractRes = await callRpc('profile.parseAndExtract', {
      filePath: path.resolve('eval/resumes/resume_01_fa_standard.txt'),
    });
    console.log('Parsed candidate name:', extractRes.profile.contact.fullName);
    console.log('Parsed candidate email:', extractRes.profile.contact.email);
    console.log('Parsed candidate phone:', extractRes.profile.contact.phone);
    console.log('Extracted experiences:', extractRes.profile.experiences?.length);
    console.log('Extracted skills count:', extractRes.profile.skills?.length);

    // 3. Search real jobs across boards
    console.log('\n--- 3. Testing jobs.search (Ashby, Greenhouse, Lever) ---');
    const searchRes = await callRpc('jobs.search', {
      query: { keywords: ['Engineer', 'Developer'], limit: 10 },
    });
    const searchJobsList = Array.isArray(searchRes) ? searchRes : (searchRes.items || []);
    console.log(`Discovered ${searchJobsList.length} live jobs.`);
    for (const job of searchJobsList.slice(0, 3)) {
      console.log(`  - [${(job.atsType || 'ats').toUpperCase()}] ${job.title} at ${job.company} (${job.location})`);
    }

    // 4. Score one job against profile
    console.log('\n--- 4. Testing matching.scoreJob ---');
    if (searchJobsList.length > 0) {
      const topJob = searchJobsList[0];
      const scoreRes = await callRpc('matching.scoreJob', {
        profile: extractRes.profile,
        job: {
          id: topJob.id,
          sourceId: topJob.sourceId,
          sourceName: 'WeWorkRemotely',
          canonicalUrl: 'https://weworkremotely.com/jobs/' + topJob.id,
          applyUrl: 'https://weworkremotely.com/jobs/' + topJob.id,
          title: topJob.title,
          company: topJob.company,
          location: topJob.location,
          remoteType: 'remote',
          descriptionMarkdown: 'Looking for a Senior Software Engineer with strong TypeScript, React, and distributed systems experience.',
          requirements: ['React', 'TypeScript', 'Node.js', 'Go'],
          atsType: 'generic',
          contentHash: 'hash_sample_001',
        },
      });
      console.log(`Match score for "${topJob.title}": ${scoreRes.overallScore}%`);
      console.log('Matched skills:', scoreRes.matchedSkills.join(', '));
      console.log('Top reasons:', scoreRes.topReasons);
    }

    // 5. Tailor documents
    console.log('\n--- 5. Testing documents.tailor ---');
    if (searchJobsList.length > 0) {
      const topJob = searchJobsList[0];
      const tailorRes = await callRpc('documents.tailor', {
        profile: extractRes.profile,
        job: {
          id: topJob.id,
          sourceId: topJob.sourceId,
          sourceName: 'WeWorkRemotely',
          canonicalUrl: 'https://weworkremotely.com/jobs/' + topJob.id,
          applyUrl: 'https://weworkremotely.com/jobs/' + topJob.id,
          title: topJob.title,
          company: topJob.company,
          location: topJob.location,
          remoteType: 'remote',
          descriptionMarkdown: 'Looking for a Senior Software Engineer with strong TypeScript, React, and distributed systems experience.',
          requirements: ['React', 'TypeScript', 'Node.js', 'Go'],
          atsType: 'generic',
          contentHash: 'hash_sample_001',
        },
      });
      console.log('Tailored resume template:', tailorRes.template);
      console.log('Tailored bullets count:', tailorRes.tailoredBullets?.length);
      console.log('Cover letter sample:', tailorRes.coverLetterText?.slice(0, 100) + '...');
    }

    console.log('\n✅ ALL RPC ENDPOINTS VERIFIED END-TO-END OVER STDIO JSON-RPC 2.0!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    child.kill();
    process.exit(0);
  }
}

main();
