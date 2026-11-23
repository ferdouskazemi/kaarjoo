import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractContactInfo } from '../../packages/engine/src/ingestion/extractors/contact.js';
import { extractExperiences } from '../../packages/engine/src/ingestion/extractors/experience.js';
import { detectSectionType } from '../../packages/engine/src/ingestion/sections.js';
import { normalizeText } from '../../packages/engine/src/ingestion/normalizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resumesDir = path.resolve(__dirname, '../resumes');

interface EvaluationMetrics {
  totalResumes: number;
  contactAccuracy: number;
  experienceAccuracy: number;
}

async function runEvaluation(): Promise<EvaluationMetrics> {
  console.log('=====================================================');
  console.log('   Kaarjoo Profile Extraction Evaluation Harness     ');
  console.log('   Targets: Contact >= 0.98, Experience >= 0.92      ');
  console.log('=====================================================\n');

  const files = fs.readdirSync(resumesDir);
  const textFiles = files.filter((f) => f.endsWith('.txt'));

  let contactCorrect = 0;
  let contactTotal = 0;

  let experienceCorrect = 0;
  let experienceTotal = 0;

  for (const textFile of textFiles) {
    const baseName = textFile.replace('.txt', '');
    const jsonFile = `${baseName}.json`;
    const jsonPath = path.join(resumesDir, jsonFile);

    if (!fs.existsSync(jsonPath)) {
      console.warn(`[WARN] Skipping ${textFile} - golden JSON missing!`);
      continue;
    }

    const rawContent = fs.readFileSync(path.join(resumesDir, textFile), 'utf-8');
    const golden = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    const pages = [{ pageNumber: 1, text: rawContent }];

    // 1. Evaluate Contact Extraction
    const extractedContact = extractContactInfo(pages);

    contactTotal += 2; // email and phone evaluated
    if (extractedContact?.email === golden.contact.email) {
      contactCorrect++;
    } else {
      console.error(`[FAIL] ${textFile} Email mismatch: Extracted '${extractedContact?.email}' vs Golden '${golden.contact.email}'`);
    }

    if (extractedContact?.phone === golden.contact.phone) {
      contactCorrect++;
    } else {
      console.error(`[FAIL] ${textFile} Phone mismatch: Extracted '${extractedContact?.phone}' vs Golden '${golden.contact.phone}'`);
    }

    // 2. Evaluate Experience Extraction
    // Segment experience section
    const lines = rawContent.split(/\r?\n/);
    let inExpSection = false;
    let expLines: string[] = [];

    for (const line of lines) {
      const type = detectSectionType(line);
      if (type === 'experience') {
        inExpSection = true;
        continue;
      } else if (inExpSection && type !== 'unknown') {
        inExpSection = false;
      }

      if (inExpSection) {
        expLines.push(line);
      }
    }

    const expText = expLines.join('\n');
    const extractedExperiences = extractExperiences(expText);

    experienceTotal += golden.experiences.length;
    for (let i = 0; i < golden.experiences.length; i++) {
      const g = golden.experiences[i];
      const match = extractedExperiences.find((e) => e.startDate === g.startDate && e.isCurrent === (g.isCurrent ?? false));
      if (match) {
        experienceCorrect++;
      } else {
        console.error(`[FAIL] ${textFile} Experience item mismatch for startDate '${g.startDate}'`);
      }
    }

    console.log(`✓ Processed ${textFile}: Contact OK, Experiences ${extractedExperiences.length}/${golden.experiences.length}`);
  }

  const contactAccuracy = contactTotal > 0 ? contactCorrect / contactTotal : 0;
  const experienceAccuracy = experienceTotal > 0 ? experienceCorrect / experienceTotal : 0;

  console.log('\n---------------- Evaluation Summary -----------------');
  console.log(`Total Golden Resumes Evaluated: ${textFiles.length}`);
  console.log(`Contact Fields Accuracy: ${(contactAccuracy * 100).toFixed(1)}% (Target >= 98.0%)`);
  console.log(`Experience Items Accuracy: ${(experienceAccuracy * 100).toFixed(1)}% (Target >= 92.0%)`);
  console.log('-----------------------------------------------------\n');

  if (contactAccuracy < 0.98 || experienceAccuracy < 0.92) {
    console.error('❌ Accuracy targets NOT met! Failing eval harness.');
    process.exit(1);
  }

  console.log('✅ ALL ACCURACY TARGETS MET!');
  return {
    totalResumes: textFiles.length,
    contactAccuracy,
    experienceAccuracy,
  };
}

runEvaluation().catch((err) => {
  console.error('Eval harness failed:', err);
  process.exit(1);
});
