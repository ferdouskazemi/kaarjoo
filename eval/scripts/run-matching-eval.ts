import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rankJob } from '../../packages/engine/src/matching/rerank.js';
import type { JobPosting, UserProfile } from '@kaarjoo/shared';

interface TestCase {
  id: string;
  profile: UserProfile;
  jobs: Array<JobPosting & { groundTruth: 'relevant' | 'irrelevant' }>;
}

interface BenchmarkDataset {
  testCases: TestCase[];
}

function runMatchingEvaluation(): void {
  console.log('=====================================================');
  console.log('   Kaarjoo Matching & Ranking Evaluation Harness     ');
  console.log('   Target Metric: Precision@10 >= 0.80               ');
  console.log('=====================================================\n');

  const datasetPath = resolve(__dirname, '../matching/labeled_pairs.json');
  const rawData = readFileSync(datasetPath, 'utf-8');
  const dataset: BenchmarkDataset = JSON.parse(rawData);

  let totalRelevantInTopK = 0;
  let totalEvaluated = 0;

  for (const tc of dataset.testCases) {
    console.log(`Evaluating Candidate: ${tc.profile.contact.fullName} (${tc.id})`);

    const scoredJobs = tc.jobs.map((job) => {
      const match = rankJob(tc.profile, job, tc.profile.preferences);
      return {
        job,
        match,
        groundTruth: job.groundTruth,
      };
    });

    // Sort descending by overall score
    scoredJobs.sort((a, b) => b.match.overallScore - a.match.overallScore);

    console.log('\n--- Ranked Results ---');
    scoredJobs.forEach((item, index) => {
      const isCorrect = (item.match.overallScore >= 70 && item.groundTruth === 'relevant') ||
                        (item.match.overallScore < 60 && item.groundTruth === 'irrelevant');
      const mark = isCorrect ? '✓' : '✗';

      console.log(
        `${mark} [Rank #${index + 1}] Score: ${item.match.overallScore.toString().padStart(3)}% | ` +
        `GT: ${item.groundTruth.padEnd(10)} | ` +
        `Company: ${item.job.company.padEnd(12)} | ` +
        `Title: ${item.job.title}`
      );
      if (item.match.redFlags.length > 0) {
        console.log(`    ↳ Red Flags: ${item.match.redFlags.join(', ')}`);
      }
    });

    // Precision calculation on top candidates
    const relevantJobs = scoredJobs.filter(j => j.groundTruth === 'relevant');
    const topK = scoredJobs.slice(0, relevantJobs.length);
    const correctInTopK = topK.filter(j => j.groundTruth === 'relevant').length;

    totalRelevantInTopK += correctInTopK;
    totalEvaluated += topK.length;

    console.log(`\nCandidate Precision: ${(correctInTopK / topK.length * 100).toFixed(1)}%\n`);
  }

  const overallPrecision = totalEvaluated > 0 ? totalRelevantInTopK / totalEvaluated : 1.0;
  console.log('---------------- Benchmark Summary ------------------');
  console.log(`Overall Precision: ${(overallPrecision * 100).toFixed(1)}% (Target >= 80.0%)`);
  console.log('-----------------------------------------------------');

  if (overallPrecision < 0.8) {
    console.error('❌ FAILED: Precision fell below 80% threshold.');
    process.exit(1);
  } else {
    console.log('✅ ALL MATCHING BENCHMARK TARGETS MET!\n');
  }
}

runMatchingEvaluation();
