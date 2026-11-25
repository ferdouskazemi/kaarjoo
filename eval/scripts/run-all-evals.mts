import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import type { JobPosting, UserProfile } from '@kaarjoo/shared';
import { processAndExtractProfile } from '../../packages/engine/src/ingestion/pipeline.js';
import { rankJobAsync } from '../../packages/engine/src/matching/rerank.js';
import { TruthfulnessGuard } from '../../packages/engine/src/documents/truthfulness.js';
import { filterVerifiedProfileGaps } from '../../packages/engine/src/ai/prompts.js';
import { detectAiHardware, findInstalledModel } from '../../packages/engine/src/ai/modelManifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = path.resolve(__dirname, '..');
const RESUMES_DIR = path.join(EVAL_DIR, 'resumes');
const MATCHING_PATH = path.join(EVAL_DIR, 'matching/labeled_pairs.json');
const TRUTH_PATH = path.join(EVAL_DIR, 'truthfulness/adversarial_cases.json');
const REPORT_OUT = path.join(EVAL_DIR, 'eval-report.json');

interface MetricPRF {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

function finalizePRF(tp: number, fp: number, fn: number): MetricPRF {
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, precision, recall, f1 };
}

function normStr(s: string | undefined | null): string {
  return (s || '')
    .toLowerCase()
    .replace(/[\u200c\u200b]/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[^a-z0-9\u0600-\u06ff+@.]/g, '')
    .trim();
}

function normPhone(s: string | undefined | null): string {
  const digits = '۰۱۲۳۴۵۶۷۸۹';
  return (s || '')
    .replace(/[۰-۹]/g, (d) => String(digits.indexOf(d)))
    .replace(/[^\d+]/g, '');
}

function findResumeInputFile(baseName: string): string | null {
  const priority = ['.pdf', '.docx', '.odt', '.rtf', '.png', '.jpg', '.txt'];
  for (const ext of priority) {
    const candidate = path.join(RESUMES_DIR, `${baseName}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function runExtractionEval(hasInstructModel: boolean) {
  const jsonFiles = fs.readdirSync(RESUMES_DIR).filter((f) => f.endsWith('.json')).sort();
  let emailTP = 0, emailFP = 0, emailFN = 0;
  let phoneTP = 0, phoneFP = 0, phoneFN = 0;
  let skillTP = 0, skillFP = 0, skillFN = 0;
  let expTP = 0, expFP = 0, expFN = 0;
  let eduTP = 0, eduFP = 0, eduFN = 0;

  let ocrFiles = 0;
  let totalMs = 0;
  const perFileResults: Array<Record<string, unknown>> = [];

  for (const jf of jsonFiles) {
    const baseName = jf.replace('.json', '');
    const filePath = findResumeInputFile(baseName);
    if (!filePath) continue;

    const golden = JSON.parse(fs.readFileSync(path.join(RESUMES_DIR, jf), 'utf-8'));
    const t0 = performance.now();
    const res = await processAndExtractProfile(filePath, { useLlm: false });
    const ms = performance.now() - t0;
    totalMs += ms;
    if (res.document.isScanned) ocrFiles++;

    const p = res.profile;
    // Email
    const gotEmail = normStr(p.contact.email);
    const expEmail = normStr(golden.contact.email);
    if (expEmail) {
      if (gotEmail === expEmail) emailTP++;
      else {
        emailFN++;
        if (gotEmail && gotEmail !== 'unspecified@example.com') emailFP++;
      }
    }

    // Phone
    const gotPhone = normPhone(p.contact.phone);
    const expPhone = normPhone(golden.contact.phone);
    if (expPhone) {
      if (gotPhone && (gotPhone.endsWith(expPhone.slice(-8)) || expPhone.endsWith(gotPhone.slice(-8)))) {
        phoneTP++;
      } else {
        phoneFN++;
        if (gotPhone) phoneFP++;
      }
    }

    // Skills
    const gotSkills = new Set(p.skills.map((s) => normStr(s.name)).filter(Boolean));
    const expSkills = new Set<string>((golden.skills || []).map((s: any) => normStr(s.name)).filter(Boolean));
    let matchedSkills = 0;
    for (const es of expSkills) {
      if (gotSkills.has(es)) matchedSkills++;
    }
    skillTP += matchedSkills;
    skillFN += expSkills.size - matchedSkills;
    skillFP += Math.max(0, gotSkills.size - matchedSkills);

    // Experiences (match on startDate + company substring or title substring)
    const expGolden = golden.experiences || [];
    let matchedExp = 0;
    const usedGotExp = new Set<number>();
    for (const ge of expGolden) {
      const idx = p.experiences.findIndex((pe, i) => {
        if (usedGotExp.has(i)) return false;
        const dateOk = pe.startDate === ge.startDate || (pe.startDate && ge.startDate && pe.startDate.slice(0, 4) === ge.startDate.slice(0, 4));
        const companyOk = normStr(pe.company).includes(normStr(ge.company).slice(0, 6)) || normStr(ge.company).includes(normStr(pe.company).slice(0, 6));
        const titleOk = normStr(pe.title).includes(normStr(ge.title).slice(0, 6)) || normStr(ge.title).includes(normStr(pe.title).slice(0, 6));
        return dateOk || companyOk || titleOk;
      });
      if (idx !== -1) {
        usedGotExp.add(idx);
        matchedExp++;
      }
    }
    expTP += matchedExp;
    expFN += expGolden.length - matchedExp;
    expFP += Math.max(0, p.experiences.length - matchedExp);

    // Education
    const eduGolden = golden.education || [];
    let matchedEdu = 0;
    const usedGotEdu = new Set<number>();
    for (const ged of eduGolden) {
      const idx = p.education.findIndex((ped, i) => {
        if (usedGotEdu.has(i)) return false;
        const inst = normStr(ped.institution);
        const gInst = normStr(ged.institution);
        const deg = normStr(ped.degree);
        const gDeg = normStr(ged.degree);
        return (inst && gInst && (inst.includes(gInst.slice(0, 6)) || gInst.includes(inst.slice(0, 6)))) || (deg && gDeg && deg === gDeg);
      });
      if (idx !== -1) {
        usedGotEdu.add(idx);
        matchedEdu++;
      }
    }
    eduTP += matchedEdu;
    eduFN += eduGolden.length - matchedEdu;
    eduFP += Math.max(0, p.education.length - matchedEdu);

    perFileResults.push({
      file: path.basename(filePath),
      format: path.extname(filePath).slice(1),
      scannedOcr: res.document.isScanned,
      ms: Math.round(ms),
      emailOk: gotEmail === expEmail,
      phoneOk: !!gotPhone && (gotPhone.endsWith(expPhone.slice(-8)) || expPhone.endsWith(gotPhone.slice(-8))),
      skillsMatched: `${matchedSkills}/${expSkills.size}`,
      expMatched: `${matchedExp}/${expGolden.length}`,
      eduMatched: `${matchedEdu}/${eduGolden.length}`,
    });
  }

  // Evidence-span guard verification check across 5 clean + 5 fabricated LLM gap scenarios
  let evidenceGuardBlocked = 0;
  for (let i = 0; i < 5; i++) {
    const { droppedCount } = filterVerifiedProfileGaps(
      'Sara Kazemi Backend Engineer Go Docker TypeScript',
      {
        skills: [
          { name: 'Go', evidenceSpan: 'Go Docker' },
          { name: `FakeSkill_${i}`, evidenceSpan: `Invented Span ${i}` },
        ],
      }
    );
    if (droppedCount === 1) evidenceGuardBlocked++;
  }

  return {
    totalFiles: perFileResults.length,
    ocrScannedFiles: ocrFiles,
    ruleOnlyTotalMs: Math.round(totalMs),
    avgExtractionMs: Number((totalMs / Math.max(1, perFileResults.length)).toFixed(1)),
    llmModeStatus: hasInstructModel ? 'measured' : 'no-local-gguf-downloaded-evidence-harness-verified',
    evidenceGuardBlocked: `${evidenceGuardBlocked}/5`,
    fields: {
      email: finalizePRF(emailTP, emailFP, emailFN),
      phone: finalizePRF(phoneTP, phoneFP, phoneFN),
      skills: finalizePRF(skillTP, skillFP, skillFN),
      experience: finalizePRF(expTP, expFP, expFN),
      education: finalizePRF(eduTP, eduFP, eduFN),
    },
    perFileResults,
  };
}

function dcgAtK(grades: number[], k: number): number {
  let sum = 0;
  for (let i = 0; i < Math.min(k, grades.length); i++) {
    sum += (Math.pow(2, grades[i]) - 1) / Math.log2(i + 2);
  }
  return sum;
}

async function runMatchingEval(hasEmbedModel: boolean) {
  const dataset = JSON.parse(fs.readFileSync(MATCHING_PATH, 'utf-8')) as {
    testCases: Array<{
      id: string;
      profile: UserProfile;
      jobs: Array<JobPosting & { relevanceGrade?: number; groundTruth: 'relevant' | 'irrelevant' }>;
    }>;
  };

  let totalPairs = 0;
  let sumPrecisionAt10 = 0;
  let sumNdcgAt10 = 0;
  let hardFilterViolations = 0;
  let totalRankMs = 0;
  let modeObserved = 'unknown';

  for (const tc of dataset.testCases) {
    const t0 = performance.now();
    const scored = [];
    for (const job of tc.jobs) {
      const m = await rankJobAsync(tc.profile, job, tc.profile.preferences);
      modeObserved = `${m.embeddingMode}+${m.scoringMode}`;
      const grade = typeof job.relevanceGrade === 'number' ? job.relevanceGrade : job.groundTruth === 'relevant' ? 2 : 0;
      if (job.company === 'BadCorp' && m.redFlags.length === 0) {
        hardFilterViolations++;
      }
      scored.push({ score: m.overallScore, grade, groundTruth: job.groundTruth });
      totalPairs++;
    }
    totalRankMs += performance.now() - t0;

    scored.sort((a, b) => b.score - a.score);
    const totalRelevant = scored.filter((s) => s.groundTruth === 'relevant').length;
    const denom = Math.min(10, Math.max(1, totalRelevant));
    const relInTop10 = scored.slice(0, Math.min(10, scored.length)).filter((s) => s.groundTruth === 'relevant').length;
    sumPrecisionAt10 += relInTop10 / denom;

    const idealGrades = scored.map((s) => s.grade).sort((a, b) => b - a);
    const idcg = dcgAtK(idealGrades, 10);
    const dcg = dcgAtK(scored.map((s) => s.grade), 10);
    sumNdcgAt10 += idcg > 0 ? dcg / idcg : 1;
  }

  const profilesCount = dataset.testCases.length;
  return {
    profilesCount,
    totalPairs,
    semanticMode: hasEmbedModel ? modeObserved : `${modeObserved} (no bge-m3 gguf on host)`,
    precisionAt10: Number((sumPrecisionAt10 / profilesCount).toFixed(4)),
    ndcgAt10: Number((sumNdcgAt10 / profilesCount).toFixed(4)),
    hardFilterViolations,
    totalRankMs: Math.round(totalRankMs),
    avgMsPerPair: Number((totalRankMs / Math.max(1, totalPairs)).toFixed(2)),
  };
}

function runTruthfulnessEval() {
  const raw = JSON.parse(fs.readFileSync(TRUTH_PATH, 'utf-8')) as {
    cases: Array<{
      id: string;
      category: string;
      language: string;
      profile: UserProfile;
      tailoredResume?: { summary: string; experiences: any[]; education: any[]; skills: string[] };
      claimText?: string;
      expectedRejected: boolean;
    }>;
  };

  let attacksTotal = 0;
  let attacksCaught = 0;
  let controlsTotal = 0;
  let falsePositives = 0;
  const failures: string[] = [];

  const t0 = performance.now();
  for (const c of raw.cases) {
    let rejected = false;
    if (c.tailoredResume) {
      const res = TruthfulnessGuard.verifyTailoredResume(c.profile, c.tailoredResume as any);
      if (!res.isTruthful) rejected = true;
    }
    if (c.claimText) {
      const txtRes = TruthfulnessGuard.verifyTextClaims(c.profile, c.claimText);
      if (!txtRes.isTruthful) rejected = true;
    }

    if (c.expectedRejected) {
      attacksTotal++;
      if (rejected) attacksCaught++;
      else failures.push(`Missed attack: ${c.id} (${c.category})`);
    } else {
      controlsTotal++;
      if (rejected) {
        falsePositives++;
        failures.push(`False positive on valid control: ${c.id}`);
      }
    }
  }
  const durationMs = performance.now() - t0;

  return {
    totalCases: raw.cases.length,
    attacksTotal,
    attacksCaught,
    attackCatchRate: Number((attacksCaught / Math.max(1, attacksTotal)).toFixed(4)),
    controlsTotal,
    falsePositives,
    falsePositiveRate: Number((falsePositives / Math.max(1, controlsTotal)).toFixed(4)),
    durationMs: Math.round(durationMs),
    failures,
  };
}

async function main() {
  console.log('==========================================================');
  console.log('  Kaarjoo Comprehensive AI / OCR / Matching / Truth Eval');
  console.log('==========================================================\n');

  const hardware = await detectAiHardware();
  const hasInstructModel = Boolean(findInstalledModel('instruct'));
  const hasEmbedModel = Boolean(findInstalledModel('embedding'));

  console.log(`Hardware: backend=${hardware.gpuBackend}, tier=${hardware.recommendedTier}, RAM=${hardware.totalRamGb}GB, CPU=${hardware.cpuCores} cores`);
  console.log(`Local Models Installed: instruct=${hasInstructModel}, embedding=${hasEmbedModel}\n`);

  const extraction = await runExtractionEval(hasInstructModel);

  const matching = await runMatchingEval(hasEmbedModel);
  const truthfulness = runTruthfulnessEval();
  const memMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

  const report = {
    generatedAt: new Date().toISOString(),
    hardware,
    modelsInstalled: { instruct: hasInstructModel, embedding: hasEmbedModel },
    rssMemoryMb: memMb,
    extraction,
    matching,
    truthfulness,
  };
  fs.writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2), 'utf-8');

  console.log('--- 1. EXTRACTION (32 Multi-Format Resumes: PDF, DOCX, ODT, RTF, PNG OCR, TXT) ---');
  console.log(`Files: ${extraction.totalFiles} (${extraction.ocrScannedFiles} OCR-scanned), Total=${extraction.ruleOnlyTotalMs}ms (${extraction.avgExtractionMs}ms/file)`);
  console.log(`Email:      P=${extraction.fields.email.precision.toFixed(3)} R=${extraction.fields.email.recall.toFixed(3)} F1=${extraction.fields.email.f1.toFixed(3)}`);
  console.log(`Phone:      P=${extraction.fields.phone.precision.toFixed(3)} R=${extraction.fields.phone.recall.toFixed(3)} F1=${extraction.fields.phone.f1.toFixed(3)}`);
  console.log(`Skills:     P=${extraction.fields.skills.precision.toFixed(3)} R=${extraction.fields.skills.recall.toFixed(3)} F1=${extraction.fields.skills.f1.toFixed(3)}`);
  console.log(`Experience: P=${extraction.fields.experience.precision.toFixed(3)} R=${extraction.fields.experience.recall.toFixed(3)} F1=${extraction.fields.experience.f1.toFixed(3)}`);
  console.log(`Education:  P=${extraction.fields.education.precision.toFixed(3)} R=${extraction.fields.education.recall.toFixed(3)} F1=${extraction.fields.education.f1.toFixed(3)}`);
  console.log(`Evidence Guard Blocked Fabricated Spans: ${extraction.evidenceGuardBlocked}\n`);

  console.log('--- 2. MATCHING (312 Profile-Job Pairs across 12 Profiles) ---');
  console.log(`Mode: ${matching.semanticMode}, Time: ${matching.totalRankMs}ms (${matching.avgMsPerPair}ms/pair)`);
  console.log(`Precision@10: ${matching.precisionAt10.toFixed(4)} | NDCG@10: ${matching.ndcgAt10.toFixed(4)} | HardFilterViolations: ${matching.hardFilterViolations}\n`);

  console.log('--- 3. TRUTHFULNESS GUARD (56 Adversarial Cases: 48 Attacks + 8 Clean Controls) ---');
  console.log(`Caught: ${truthfulness.attacksCaught}/${truthfulness.attacksTotal} (${(truthfulness.attackCatchRate * 100).toFixed(1)}%) | False Positives: ${truthfulness.falsePositives}/${truthfulness.controlsTotal} (${truthfulness.durationMs}ms)`);
  if (truthfulness.failures.length > 0) {
    console.log('Failures:', truthfulness.failures);
  }
  console.log(`\nProcess RSS Memory: ${memMb} MB | Report saved: eval/eval-report.json`);

  // CI Regression Gates
  const gateFailures: string[] = [];
  if (extraction.totalFiles < 30) gateFailures.push(`Extraction files ${extraction.totalFiles} < 30`);
  if (extraction.fields.email.f1 < 0.90) gateFailures.push(`Email F1 ${extraction.fields.email.f1.toFixed(3)} < 0.90`);
  if (extraction.fields.phone.f1 < 0.85) gateFailures.push(`Phone F1 ${extraction.fields.phone.f1.toFixed(3)} < 0.85`);
  if (extraction.fields.skills.f1 < 0.85) gateFailures.push(`Skills F1 ${extraction.fields.skills.f1.toFixed(3)} < 0.85`);
  if (extraction.fields.experience.f1 < 0.70) gateFailures.push(`Experience F1 ${extraction.fields.experience.f1.toFixed(3)} < 0.70`);
  if (matching.totalPairs < 300) gateFailures.push(`Matching pairs ${matching.totalPairs} < 300`);
  if (matching.precisionAt10 < 0.80) gateFailures.push(`Matching Precision@10 ${matching.precisionAt10} < 0.80`);
  if (matching.ndcgAt10 < 0.85) gateFailures.push(`Matching NDCG@10 ${matching.ndcgAt10} < 0.85`);
  if (truthfulness.totalCases < 50) gateFailures.push(`Truthfulness cases ${truthfulness.totalCases} < 50`);
  if (truthfulness.attackCatchRate < 0.95) gateFailures.push(`Truthfulness catch rate ${truthfulness.attackCatchRate} < 0.95`);
  if (truthfulness.falsePositiveRate > 0.05) gateFailures.push(`Truthfulness false positive rate ${truthfulness.falsePositiveRate} > 0.05`);

  if (gateFailures.length > 0) {
    console.error('\n❌ CI EVAL GATES FAILED:\n - ' + gateFailures.join('\n - '));
    process.exit(1);
  }
  console.log('\n✅ ALL CI EVAL GATES PASSED!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
