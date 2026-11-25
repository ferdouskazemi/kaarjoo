# Kaarjoo AI, OCR, Extraction, Matching & Truthfulness Evaluation Report

All numbers below are reproducible via `pnpm eval:ci` (runs [`eval/scripts/run-all-evals.mts`](../eval/scripts/run-all-evals.mts) and writes [`eval/eval-report.json`](../eval/eval-report.json)). Regression gates run automatically on every PR in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## 1. Host Environment & Local AI Hardware Telemetry

- **OS / Arch:** `win32` / `x64`
- **CPU / RAM:** `8` cores / `32` GB system RAM
- **Detected `node-llama-cpp` GPU Backend:** `vulkan` (`21,491,564,544` bytes total VRAM, `20,055,880,500` bytes free)
- **Recommended Tier:** `pro` (`Qwen3-14B` / `Qwen3-8B` / `BGE-M3`)
- **Models Downloaded on Host During Run:** `instruct=false`, `embedding=false`
- **Honest LLM Telemetry Note:** Because multi-GB GGUF model files (`1.1 GB – 9.0 GB`) are downloaded on demand at user runtime (never committed or bundled), live LLM tokens/sec and `rule+llm` vs `rule-only` live delta on GGUF weights were **not** executed during this offline CI run (`llmModeStatus: no-local-gguf-downloaded-evidence-harness-verified`). Instead, this evaluation directly measures the complete rule-based + real PDF/DOCX/ODT/RTF/Tesseract OCR pipeline, deterministic TF-IDF + hard-filter matching fallback, SQLite embedding BLOB cache roundtrips, `TruthfulnessGuard`, and the verbatim `verifyEvidenceSpan` guard (`5/5` fabricated LLM claims dropped).

---

## 2. Résumé Extraction Evaluation (32 Multi-Format Fixtures)

**Dataset ([`eval/resumes/`](../eval/resumes/)):** **32** anonymized/synthetic résumés paired with golden JSONs across English, Persian (`fa`), and mixed (`fa+en`); layouts covering one-column, two-column, HTML/DOCX tables, LinkedIn-export layout, Europass layout, and OCR-scanned pages:
- Real **PDF** (`pdfjs-dist` Y-coordinate line reconstruction + Chromium-rendered scanned PDF fallback to Tesseract OCR)
- Real **DOCX** (`mammoth`)
- Real **ODT** (`content.xml` deflate ZIP parser)
- Real **RTF** (EN + Persian `\uN` Unicode escapes)
- Real **PNG** (offline `tesseract.js` `eng+fas` using bundled `traineddata/`)
- **TXT**

| Field | TP | FP | FN | Precision | Recall | F1 | Mode |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **Email** | 30 | 2 | 2 | 0.938 | 0.938 | **0.938** | `rule-only` |
| **Phone** | 28 | 4 | 4 | 0.875 | 0.875 | **0.875** | `rule-only` |
| **Skills** | 160 | 14 | 21 | 0.920 | 0.884 | **0.901** | `rule-only` |
| **Experience** | 32 | 0 | 10 | 1.000 | 0.762 | **0.865** | `rule-only` |
| **Education** | 24 | 24 | 8 | 0.500 | 0.750 | **0.600** | `rule-only` |

- **Evidence-Span Guard (`filterVerifiedProfileGaps`):** **5/5** fabricated LLM gap suggestions dropped when `evidenceSpan` was absent from normalized source text.
- **Total Extraction Time:** `18,296 ms` across 32 files (**571.7 ms/file average**, including 5 full Tesseract `eng+fas` OCR pages at `~1.4–5.8s` each; native `.pdf`/`.docx`/`.odt`/`.rtf` average `~2–38 ms`).
- **Peak Process RSS:** `427 MB`.

---

## 3. Job Matching & Ranking Evaluation (312 Profile–Job Pairs)

**Dataset ([`eval/matching/labeled_pairs.json`](../eval/matching/labeled_pairs.json)):** **12** diverse candidate profiles (Backend Go/Node, Frontend React/TS, Rust Systems, ML/NLP PyTorch, DevOps/K8s, QA Playwright, Mobile Flutter/Kotlin, AppSec, Data Platform, Fullstack Node, Kabul NGO IM/GIS, Java/Kafka) evaluated across **26** realistic job postings each (**312 total profile–job pairs**) with graded relevance (`0..3`).

| Metric | Value | Threshold |
| --- | ---: | ---: |
| **Precision@10** | **0.8819 (88.2%)** | `>= 0.80` |
| **NDCG@10** | **0.9336 (93.4%)** | `>= 0.85` |
| **Hard Filter Violations (`BadCorp` etc.)** | **0** | `0` |
| **Semantic / Scoring Mode Measured** | `tfidf-fallback+rule-fallback` | Fallback |
| **Total Ranking Latency (312 pairs)** | `487 ms` (`1.56 ms/pair`) | — |

---

## 4. Truthfulness / Anti-Hallucination Evaluation (56 Adversarial Cases)

**Dataset ([`eval/truthfulness/adversarial_cases.json`](../eval/truthfulness/adversarial_cases.json)):** **48 adversarial attack cases** (fabricated companies, titles, dates, skills, degrees/universities, and inflated EN/FA experience durations/percentages across both English and Persian) plus **8 clean valid control cases**.

| Metric | Measured Result |
| --- | --- |
| **Adversarial Attacks Caught** | **48 / 48 (100.0%)** |
| **False Positives on Valid Controls** | **0 / 8 (0.0%)** |
| **Total Evaluation Time** | `3 ms` |

---

## 5. Model Manifest & Open-Weight Licenses

Every model in [`packages/engine/src/ai/modelManifest.json`](../packages/engine/src/ai/modelManifest.json) uses a permissive OSI-approved license, verified against Hugging Face LFS metadata:

| Model ID | Tier | Quant | License | Size | Status |
| --- | --- | --- | --- | ---: | --- |
| `qwen2.5-1.5b-instruct-q4` | `lite` | Q4_K_M | `Apache-2.0` | 1.12 GB | On-demand HTTPS Range + SHA-256 |
| `qwen3-4b-instruct-q4` | `lite` | Q4_K_M | `Apache-2.0` | 2.50 GB | On-demand HTTPS Range + SHA-256 |
| `qwen3-8b-instruct-q4` | `standard` | Q4_K_M | `Apache-2.0` | 5.03 GB | On-demand HTTPS Range + SHA-256 |
| `qwen3-14b-instruct-q4` | `pro` | Q4_K_M | `Apache-2.0` | 9.00 GB | On-demand HTTPS Range + SHA-256 |
| `bge-m3-q8` | `standard` | Q8_0 | `MIT` | 0.63 GB | On-demand HTTPS Range + SHA-256 |

---

## 6. Reproducing Locally & In CI

```bash
pnpm eval:ci         # Runs 32-resume extraction, 312-pair matching, 56-case truthfulness gate
pnpm test            # Unit + integration tests (incl. tesseract.js OCR, ODT/RTF/DOC, SQLite cache)
pnpm benchmark:fts   # SQLite FTS5 search benchmark over 100,000 indexed jobs
pnpm smoke:test      # End-to-end packaged sidecar + Playwright Review Mode + Unicode path test
```
