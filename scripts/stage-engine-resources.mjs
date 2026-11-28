import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENGINE_DIST = path.join(ROOT_DIR, 'packages', 'engine', 'dist');
const COMPANIES_DIR = path.join(ROOT_DIR, 'packages', 'adapters', 'src', 'companies');
const RESOURCES_ENGINE = path.join(ROOT_DIR, 'apps', 'desktop', 'src-tauri', 'resources', 'engine');

function copyDirDereference(src, dest, skipNodeModules = false) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skipNodeModules && entry.name === 'node_modules') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirDereference(srcPath, destPath, false);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function resolveDepFrom(baseDir, depName) {
  const realBase = fs.realpathSync(baseDir);
  const parts = depName.split('/');
  const candidates = [
    path.join(realBase, 'node_modules', ...parts),
    path.join(path.dirname(realBase), ...parts),
    path.join(path.dirname(path.dirname(realBase)), ...parts),
    path.join(ROOT_DIR, 'packages', 'engine', 'node_modules', ...parts),
    path.join(ROOT_DIR, 'node_modules', ...parts),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json'))) {
      return fs.realpathSync(c);
    }
  }
  return null;
}

function shouldStageOptionalDep(depName) {
  if (!depName.startsWith('@node-llama-cpp/')) return true;
  if (depName.includes('cuda')) return false;

  const platform = process.env.KAARJOO_TARGET_PLATFORM || process.platform;
  const arch = process.env.KAARJOO_TARGET_ARCH || process.arch;

  if (platform === 'win32') {
    return depName === '@node-llama-cpp/win-x64' || depName === '@node-llama-cpp/win-x64-vulkan';
  }
  if (platform === 'darwin') {
    if (arch === 'arm64') return depName === '@node-llama-cpp/mac-arm64-metal';
    return depName === '@node-llama-cpp/mac-x64';
  }
  if (platform === 'linux') {
    return depName === '@node-llama-cpp/linux-x64' || depName === '@node-llama-cpp/linux-arm64';
  }
  return false;
}

function stageTransitivePackages(rootNames, destNodeModulesDir) {
  const placedTopVersion = new Map();
  const visitedEdges = new Set();
  const queue = [];

  for (const name of rootNames) {
    const resolved = resolveDepFrom(path.join(ROOT_DIR, 'packages', 'engine'), name);
    if (resolved) {
      queue.push({ name, srcDir: resolved, parentDestDir: null });
    } else if (name === 'playwright-core') {
      throw new Error('Could not locate playwright-core dependency');
    }
  }

  let count = 0;
  while (queue.length > 0) {
    const { name, srcDir, parentDestDir } = queue.shift();
    let pkgJson = {};
    try {
      pkgJson = JSON.parse(fs.readFileSync(path.join(srcDir, 'package.json'), 'utf-8'));
    } catch {
      // ignore
    }
    const version = pkgJson.version || '0.0.0';
    const edgeKey = `${parentDestDir || 'ROOT'}::${name}@${version}`;
    if (visitedEdges.has(edgeKey)) continue;
    visitedEdges.add(edgeKey);

    let targetPkgDir;
    if (!placedTopVersion.has(name)) {
      placedTopVersion.set(name, version);
      targetPkgDir = path.join(destNodeModulesDir, ...name.split('/'));
    } else if (placedTopVersion.get(name) === version) {
      // Exact version already staged at top-level
      continue;
    } else if (parentDestDir) {
      // Different semver needed by this parent (e.g. signal-exit@4 vs signal-exit@3)
      targetPkgDir = path.join(parentDestDir, 'node_modules', ...name.split('/'));
    } else {
      continue;
    }

    copyDirDereference(srcDir, targetPkgDir, true);
    count++;

    const deps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.optionalDependencies || {}),
    };
    for (const depName of Object.keys(deps)) {
      if (pkgJson.optionalDependencies?.[depName] && !shouldStageOptionalDep(depName)) {
        continue;
      }
      const resolved = resolveDepFrom(srcDir, depName);
      if (resolved) {
        queue.push({ name: depName, srcDir: resolved, parentDestDir: targetPkgDir });
      }
    }
  }

  console.log(`[stage-engine-resources] Staged ${count} runtime package directories (semver-isolated).`);
}

function findFileUpwards(candidates) {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function main() {
  const bundleSrc = path.join(ENGINE_DIST, 'bundle.mjs');
  if (!fs.existsSync(bundleSrc)) {
    throw new Error(`Engine bundle not found at ${bundleSrc}. Run pnpm --filter engine build first.`);
  }

  // 1. Copy runtime data files alongside packages/engine/dist/bundle.mjs for dev mode
  const pdfWorkerSrc = findFileUpwards([
    path.join(ROOT_DIR, 'packages', 'engine', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'),
    path.join(ROOT_DIR, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'),
  ]);
  if (!pdfWorkerSrc) {
    throw new Error('Could not locate pdfjs-dist/legacy/build/pdf.worker.mjs');
  }

  fs.copyFileSync(pdfWorkerSrc, path.join(ENGINE_DIST, 'pdf.worker.mjs'));

  for (const asset of ['directory.json.gz', 'manifest.json']) {
    const assetSrc = path.join(COMPANIES_DIR, asset);
    if (!fs.existsSync(assetSrc)) {
      throw new Error(`Missing company directory asset: ${assetSrc}`);
    }
    fs.copyFileSync(assetSrc, path.join(ENGINE_DIST, asset));
  }

  // 2. Stage clean standalone runtime into apps/desktop/src-tauri/resources/engine/
  fs.rmSync(RESOURCES_ENGINE, { recursive: true, force: true });
  fs.mkdirSync(RESOURCES_ENGINE, { recursive: true });

  fs.copyFileSync(bundleSrc, path.join(RESOURCES_ENGINE, 'bundle.mjs'));
  fs.copyFileSync(pdfWorkerSrc, path.join(RESOURCES_ENGINE, 'pdf.worker.mjs'));
  fs.copyFileSync(path.join(COMPANIES_DIR, 'directory.json.gz'), path.join(RESOURCES_ENGINE, 'directory.json.gz'));
  fs.copyFileSync(path.join(COMPANIES_DIR, 'manifest.json'), path.join(RESOURCES_ENGINE, 'manifest.json'));

  // 3. Stage full transitive dependency tree of external runtime packages (flattened for standalone sidecar)
  stageTransitivePackages(
    ['playwright-core', 'tesseract.js', 'node-llama-cpp'],
    path.join(RESOURCES_ENGINE, 'node_modules')
  );

  // 4. Stage traineddata resource directory (OCR assets; LLM GGUF weights remain excluded & downloaded on first run)
  const trainedDataDir = path.join(RESOURCES_ENGINE, 'traineddata');
  fs.mkdirSync(trainedDataDir, { recursive: true });
  const localTrainedDataSrc = path.join(ROOT_DIR, 'packages', 'engine', 'resources', 'traineddata');
  if (fs.existsSync(localTrainedDataSrc)) {
    copyDirDereference(localTrainedDataSrc, trainedDataDir);
  }
  fs.writeFileSync(
    path.join(trainedDataDir, 'manifest.json'),
    JSON.stringify(
      {
        languages: ['eng', 'fas'],
        note: 'OCR traineddata resource directory. Local LLM model weights (GGUF) are downloaded on first run to appDataDir/models and never bundled in installers.',
      },
      null,
      2
    )
  );

  // 5. Stage any native .node addons if present in engine/resources/native
  const nativeAddonsSrc = path.join(ROOT_DIR, 'packages', 'engine', 'resources', 'native');
  if (fs.existsSync(nativeAddonsSrc)) {
    copyDirDereference(nativeAddonsSrc, path.join(RESOURCES_ENGINE, 'native'));
  }

  console.log(`[stage-engine-resources] Successfully staged standalone engine runtime at ${RESOURCES_ENGINE}`);
}

main();
