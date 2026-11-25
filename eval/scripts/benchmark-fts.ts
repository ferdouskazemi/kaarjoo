import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';

// Titles, companies, and skills for realistic distribution
const TITLES = [
  'Senior Software Engineer', 'Staff Backend Developer', 'Principal Distributed Systems Architect',
  'Lead Frontend Engineer', 'DevOps & Cloud Infrastructure Engineer', 'Site Reliability Engineer',
  'Machine Learning Research Scientist', 'AI Platform Engineer', 'Cybersecurity Analyst',
  'Full Stack TypeScript Developer', 'Rust Systems Engineer', 'Data Platform Engineer',
  'Kubernetes Platform Specialist', 'Product Manager - Core Infrastructure', 'Engineering Manager'
];

const COMPANIES = [
  'Stripe', 'Figma', 'OpenAI', 'Datadog', 'GitLab', 'Notion', 'Automattic', 'Spotify',
  'Canva', 'Vercel', 'Brex', 'Plaid', 'Linear', 'Ramp', 'Replit', 'Cursor', 'Perplexity',
  'Anthropic', 'Modal', 'Supabase', 'Cloudflare', 'Airbnb', 'DoorDash', 'Reddit', 'Dropbox'
];

const LOCATIONS = [
  'Remote, US', 'San Francisco, CA', 'New York, NY', 'Berlin, Germany', 'London, UK',
  'Amsterdam, Netherlands', 'Austin, TX', 'Stockholm, Sweden', 'Toronto, Canada', 'Remote, Worldwide'
];

const DESCRIPTIONS = [
  'We are scaling our high-throughput distributed transaction processing engine built in Rust and Go.',
  'Help us build responsive next-generation web applications using React 19, TypeScript, and WebAssembly.',
  'Design and implement secure Kubernetes clusters, multi-cloud Terraform pipelines, and GitOps workflows.',
  'Advance generative AI inference latency, develop custom CUDA kernels, and train multi-modal neural networks.',
  'Lead zero-trust cloud infrastructure security posture, automate threat detection, and run red team exercises.'
];

export async function runFtsBenchmark(totalJobs = 100_000): Promise<{
  totalJobs: number;
  insertDurationSec: number;
  queries: Array<{ query: string; matchCount: number; latencyMs: number }>;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}> {
  console.log(`\n======================================================`);
  console.log(`  KAARJOO SQLite FTS5 SEARCH BENCHMARK (${totalJobs.toLocaleString()} JOBS)`);
  console.log(`======================================================\n`);

  const db = new DatabaseSync(':memory:');

  // Configure SQLite for high performance
  db.exec('PRAGMA journal_mode = MEMORY;');
  db.exec('PRAGMA synchronous = OFF;');
  db.exec('PRAGMA cache_size = -64000;'); // 64MB cache

  // 1. Create jobs table
  db.exec(`
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      canonical_url TEXT NOT NULL UNIQUE,
      apply_url TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      remote_type TEXT NOT NULL,
      salary_json TEXT,
      description_markdown TEXT NOT NULL,
      requirements_json TEXT NOT NULL DEFAULT '[]',
      ats_type TEXT NOT NULL DEFAULT 'generic',
      content_hash TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
  `);

  // 2. Create FTS5 virtual table using content_rowid
  db.exec(`
    CREATE VIRTUAL TABLE jobs_fts USING fts5(
      title,
      company,
      location,
      description_markdown,
      requirements_json,
      content='jobs',
      content_rowid='rowid',
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `);

  // 3. Create synchronized triggers for external content table
  db.exec(`
    CREATE TRIGGER jobs_fts_ai AFTER INSERT ON jobs BEGIN
      INSERT INTO jobs_fts(rowid, title, company, location, description_markdown, requirements_json)
      VALUES (new.rowid, new.title, new.company, coalesce(new.location, ''), new.description_markdown, new.requirements_json);
    END;

    CREATE TRIGGER jobs_fts_ad AFTER DELETE ON jobs BEGIN
      INSERT INTO jobs_fts(jobs_fts, rowid, title, company, location, description_markdown, requirements_json)
      VALUES ('delete', old.rowid, old.title, old.company, coalesce(old.location, ''), old.description_markdown, old.requirements_json);
    END;

    CREATE TRIGGER jobs_fts_au AFTER UPDATE ON jobs BEGIN
      INSERT INTO jobs_fts(jobs_fts, rowid, title, company, location, description_markdown, requirements_json)
      VALUES ('delete', old.rowid, old.title, old.company, coalesce(old.location, ''), old.description_markdown, old.requirements_json);
      INSERT INTO jobs_fts(rowid, title, company, location, description_markdown, requirements_json)
      VALUES (new.rowid, new.title, new.company, coalesce(new.location, ''), new.description_markdown, new.requirements_json);
    END;
  `);

  // 4. Batch insert 100,000 jobs
  console.log(`Generating and inserting ${totalJobs.toLocaleString()} synthetic jobs with FTS5 synchronization...`);
  const insertStart = performance.now();

  const insertStmt = db.prepare(`
    INSERT INTO jobs (
      id, source_id, canonical_url, apply_url, title, company, location,
      remote_type, description_markdown, requirements_json, ats_type, content_hash, first_seen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const SKILL_POOLS = [
    '["Rust", "Distributed Systems", "Raft", "Linux"]',
    '["TypeScript", "React", "Next.js", "Tailwind"]',
    '["Kubernetes", "Docker", "Terraform", "AWS"]',
    '["Python", "PyTorch", "CUDA", "LLMs"]',
    '["Go", "gRPC", "PostgreSQL", "Kafka"]',
    '["Security", "Penetration Testing", "OAuth", "Zero Trust"]',
    '["Data Engineering", "Snowflake", "dbt", "Airflow"]',
    '["Product Management", "Roadmapping", "Agile", "User Research"]',
    '["Mobile", "Swift", "Kotlin", "React Native"]',
    '["Backend", "Java", "Spring Boot", "Microservices"]'
  ];

  const BATCH_SIZE = 5_000;
  for (let batch = 0; batch < totalJobs; batch += BATCH_SIZE) {
    db.exec('BEGIN TRANSACTION;');
    for (let i = 0; i < BATCH_SIZE; i++) {
      const idx = batch + i;
      const title = TITLES[idx % TITLES.length];
      const company = `${COMPANIES[idx % COMPANIES.length]} ${(idx % 200) + 1}`;
      const location = LOCATIONS[idx % LOCATIONS.length];
      const desc = DESCRIPTIONS[idx % DESCRIPTIONS.length];
      const remoteType = idx % 2 === 0 ? 'remote' : 'hybrid';
      const atsType = idx % 3 === 0 ? 'greenhouse' : idx % 3 === 1 ? 'lever' : 'ashby';
      const reqs = SKILL_POOLS[idx % SKILL_POOLS.length];

      insertStmt.run(
        `job_${idx}`,
        'synthetic_ats',
        `https://careers.example.com/job/${idx}`,
        `https://careers.example.com/apply/${idx}`,
        `${title} - Level ${idx % 5}`,
        company,
        location,
        remoteType,
        desc,
        reqs,
        atsType,
        `hash_${idx}`
      );
    }
    db.exec('COMMIT;');
  }

  const insertDurationSec = (performance.now() - insertStart) / 1000;
  console.log(`Inserted and indexed ${totalJobs.toLocaleString()} records in ${insertDurationSec.toFixed(2)}s (${Math.round(totalJobs / insertDurationSec)} jobs/sec)\n`);

  // Verify FTS5 count
  const countRow = db.prepare('SELECT count(*) as count FROM jobs_fts').get() as { count: number };
  console.log(`Verified FTS5 indexed rows: ${countRow.count.toLocaleString()}`);

  // 5. Run representative search queries
  const testQueries = [
    { label: 'Single keyword (Rust)', q: 'Rust' },
    { label: 'Single keyword (TypeScript)', q: 'TypeScript' },
    { label: 'Compound concept (Distributed Systems)', q: 'distributed AND systems' },
    { label: 'Cloud infrastructure (Kubernetes)', q: 'Kubernetes' },
    { label: 'Role + company (Stripe Engineer)', q: 'Stripe AND engineer' },
    { label: 'Architecture keyword', q: 'architect' },
    { label: 'Frontend & UI keyword', q: 'frontend' },
    { label: 'Machine learning & AI', q: 'machine AND learning' },
    { label: 'Prefix query (microserv*)', q: 'microserv*' },
    { label: 'Security & Red Team', q: 'security' },
  ];

  const searchStmt = db.prepare(`
    SELECT j.id, j.title, j.company, j.location
    FROM jobs_fts
    JOIN jobs j ON j.rowid = jobs_fts.rowid
    WHERE jobs_fts MATCH ?
      AND j.status = 'active'
    ORDER BY rank
    LIMIT 50;
  `);

  const results: Array<{ query: string; matchCount: number; latencyMs: number }> = [];

  console.log(`\nExecuting benchmark search queries:\n`);

  for (const t of testQueries) {
    // Warmup query
    searchStmt.all(t.q);

    // Timed run
    const start = performance.now();
    const rows = searchStmt.all(t.q);
    const latencyMs = performance.now() - start;

    results.push({
      query: t.label,
      matchCount: rows.length,
      latencyMs,
    });

    console.log(`  - Query: ${t.label.padEnd(40)} | Results: ${rows.length.toString().padEnd(4)} | Latency: ${latencyMs.toFixed(2)} ms`);
  }

  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const p50Ms = latencies[Math.floor(latencies.length * 0.5)];
  const p95Ms = latencies[Math.floor(latencies.length * 0.95)];
  const maxMs = latencies[latencies.length - 1];

  console.log(`\n------------------------------------------------------`);
  console.log(`Benchmark Summary (Target: < 100 ms on 100k jobs):`);
  console.log(`  p50 Latency : ${p50Ms.toFixed(2)} ms`);
  console.log(`  p95 Latency : ${p95Ms.toFixed(2)} ms`);
  console.log(`  Max Latency : ${maxMs.toFixed(2)} ms`);
  console.log(`------------------------------------------------------\n`);

  if (maxMs > 100) {
    throw new Error(`Benchmark FAILED: Max latency ${maxMs.toFixed(2)}ms exceeded 100ms threshold!`);
  }

  console.log(`SUCCESS: All FTS5 searches executed in under 100ms on 100,000 jobs!`);

  db.close();

  return {
    totalJobs,
    insertDurationSec,
    queries: results,
    p50Ms,
    p95Ms,
    maxMs,
  };
}

if (process.argv[1]?.includes('benchmark-fts')) {
  runFtsBenchmark().catch((err) => {
    console.error('Benchmark error:', err);
    process.exit(1);
  });
}
