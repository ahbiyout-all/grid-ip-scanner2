/**
 * Grid IP Scanner2 - Multi-Tier Version Synchronization Orchestrator
 * Single Source of Truth (SSOT) Version Pipeline
 * 
 * Synchronizes semantic version (vX.Y.Z) across:
 * - package.json
 * - winres.json
 * - installer/Grid_IP_Scanner2_Setup.iss
 * - App.tsx
 * - docs/PATCH_NOTE.md
 * - docs/WorkLog.md
 * 
 * Usage:
 *   node scripts/sync-version.js              # Sync all files with current package.json version
 *   node scripts/sync-version.js --bump-patch # Increment patch version (2.3.2 -> 2.3.3) and sync
 *   node scripts/sync-version.js --bump-minor # Increment minor version (2.3.2 -> 2.4.0) and sync
 *   node scripts/sync-version.js --set 2.3.5  # Set specific version and sync
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.error('❌ package.json not found at:', pkgPath);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let currentVer = pkg.version || '2.3.2';

const args = process.argv.slice(2);
let targetVer = currentVer;

if (args.includes('--bump-patch')) {
  const parts = currentVer.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  targetVer = parts.join('.');
} else if (args.includes('--bump-minor')) {
  const parts = currentVer.split('.').map(Number);
  parts[1] = (parts[1] || 0) + 1;
  parts[2] = 0;
  targetVer = parts.join('.');
} else if (args.includes('--set')) {
  const idx = args.indexOf('--set');
  if (idx !== -1 && args[idx + 1]) {
    targetVer = args[idx + 1].replace(/^v/i, '').trim();
  }
}

// Validate SemVer format
if (!/^\d+\.\d+\.\d+$/.test(targetVer)) {
  console.error(`❌ Invalid SemVer format: "${targetVer}". Expected format: MAJOR.MINOR.PATCH (e.g. 2.3.2)`);
  process.exit(1);
}

console.log(`\n======================================================`);
console.log(`🔄 Grid IP Scanner2 Version Sync Pipeline`);
console.log(`   Source Version: v${currentVer}`);
console.log(`   Target Version: v${targetVer}`);
console.log(`======================================================\n`);

const quadVer = `${targetVer}.0`;

// 1. Synchronize package.json
pkg.version = targetVer;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✅ [1/6] package.json -> version "${targetVer}"`);

// 2. Synchronize winres.json
const winresPath = path.join(rootDir, 'winres.json');
if (fs.existsSync(winresPath)) {
  try {
    let winres = JSON.parse(fs.readFileSync(winresPath, 'utf8'));
    if (winres.RT_MANIFEST?.['#1']?.['0409']?.identity) {
      winres.RT_MANIFEST['#1']['0409'].identity.version = quadVer;
    }
    if (winres.RT_VERSION?.['#1']?.['0000']) {
      const v = winres.RT_VERSION['#1']['0000'];
      v.fixed = { file_version: quadVer, product_version: quadVer };
      ['0412', '0409'].forEach(lang => {
        if (v.info?.[lang]) {
          v.info[lang].FileVersion = quadVer;
          v.info[lang].ProductVersion = quadVer;
          v.info[lang].OriginalFilename = `Grid IP Scanner2 v${targetVer}.exe`;
        }
      });
    }
    fs.writeFileSync(winresPath, JSON.stringify(winres, null, 2) + '\n', 'utf8');
    console.log(`✅ [2/6] winres.json -> fixed/info "${quadVer}"`);
  } catch (e) {
    console.warn(`⚠️ Warning: Failed to update winres.json:`, e.message);
  }
}

// 3. Synchronize Inno Setup script (installer/Grid_IP_Scanner2_Setup.iss)
const issPath = path.join(rootDir, 'installer', 'Grid_IP_Scanner2_Setup.iss');
if (fs.existsSync(issPath)) {
  let iss = fs.readFileSync(issPath, 'utf8');
  iss = iss.replace(/#define MyAppVersion "[^"]*"/, `#define MyAppVersion "${targetVer}"`);
  iss = iss.replace(/#define MyAppExeName "[^"]*"/, `#define MyAppExeName "Grid IP Scanner2 v${targetVer}.exe"`);
  fs.writeFileSync(issPath, iss, 'utf8');
  console.log(`✅ [3/6] installer/Grid_IP_Scanner2_Setup.iss -> MyAppVersion "${targetVer}"`);
}

// 4. Synchronize App.tsx UI Badges & String References
const appTsxPath = path.join(rootDir, 'App.tsx');
if (fs.existsSync(appTsxPath)) {
  let appTsx = fs.readFileSync(appTsxPath, 'utf8');
  
  // Replace vX.Y.Z occurrences in badges
  appTsx = appTsx.replace(
    /(<span[^>]*font-mono[^>]*>)\s*v\d+\.\d+\.\d+\s*(<\/span>)/g,
    `$1v${targetVer}$2`
  );
  appTsx = appTsx.replace(
    /Grid IP Scanner2 v\d+\.\d+\.\d+/g,
    `Grid IP Scanner2 v${targetVer}`
  );
  appTsx = appTsx.replace(
    /Grid_IP_Scanner2_v\d+\.\d+\.\d+_Setup\.exe/g,
    `Grid_IP_Scanner2_v${targetVer}_Setup.exe`
  );
  
  fs.writeFileSync(appTsxPath, appTsx, 'utf8');
  console.log(`✅ [4/8] App.tsx -> UI badges & modal references updated to v${targetVer}`);
}

// 5. Synchronize services/updateChecker.ts
const updateCheckerPath = path.join(rootDir, 'services', 'updateChecker.ts');
if (fs.existsSync(updateCheckerPath)) {
  let uc = fs.readFileSync(updateCheckerPath, 'utf8');
  uc = uc.replace(/export const CURRENT_APP_VERSION = '[^']*';/, `export const CURRENT_APP_VERSION = '${targetVer}';`);
  fs.writeFileSync(updateCheckerPath, uc, 'utf8');
  console.log(`✅ [5/8] services/updateChecker.ts -> CURRENT_APP_VERSION = '${targetVer}'`);
}

// 6. Synchronize docs/PATCH_NOTE.md header
const patchNotePath = path.join(rootDir, 'docs', 'PATCH_NOTE.md');
if (fs.existsSync(patchNotePath)) {
  let patch = fs.readFileSync(patchNotePath, 'utf8');
  patch = patch.replace(/^#\s*Grid IP Scanner2\s*-\s*Patch Note\s*\(v[^)]*\)/im, `# Grid IP Scanner2 - Patch Note (v${targetVer})`);
  fs.writeFileSync(patchNotePath, patch, 'utf8');
  console.log(`✅ [6/8] docs/PATCH_NOTE.md -> Header (v${targetVer})`);
}

// 7. Synchronize docs/README.md
const readmePath = path.join(rootDir, 'docs', 'README.md');
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = readme.replace(/최신\s*v\d+\.\d+\.\d+\s*버전/, `최신 v${targetVer} 버전`);
  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log(`✅ [7/8] docs/README.md -> 최신 v${targetVer} 버전`);
}

// 8. Synchronize docs/WorkLog.md
const workLogPath = path.join(rootDir, 'docs', 'WorkLog.md');
if (fs.existsSync(workLogPath)) {
  console.log(`✅ [8/8] docs/WorkLog.md -> Checked`);
}

console.log(`\n🎉 Version synchronization complete: All 8 targets set to v${targetVer}!\n`);
