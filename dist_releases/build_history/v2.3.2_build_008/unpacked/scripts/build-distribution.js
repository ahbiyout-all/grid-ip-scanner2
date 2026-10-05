/**
 * Grid IP Scanner2 - Automated Multi-Folder Distribution & Build Orchestrator
 * Creates dedicated versioned/build-numbered folders under `dist_releases/`
 * including Unpacked Multi-File, Portable EXE, Official Installer, Mobile PWA, and Android APK.
 * 
 * Copyright (c) 2025-2026 AhBiYout (Cisnet). All rights reserved.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');

// 1. Resolve Semantic Version
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '2.3.2';

console.log(`\n======================================================`);
console.log(`🚀 Grid IP Scanner2 - Multi-Folder Distribution Builder`);
console.log(`   Target Version: v${version}`);
console.log(`======================================================\n`);

// 2. Resolve Build Number Sequence
const buildsTrackingFile = path.join(rootDir, '.build_sequence.json');
let buildHistory = { lastBuildNumber: 0, builds: {} };
if (fs.existsSync(buildsTrackingFile)) {
  try {
    buildHistory = JSON.parse(fs.readFileSync(buildsTrackingFile, 'utf8'));
  } catch (e) {}
}

const currentBuildNumber = (buildHistory.lastBuildNumber || 0) + 1;
buildHistory.lastBuildNumber = currentBuildNumber;

const buildKey = `v${version}_build_${String(currentBuildNumber).padStart(3, '0')}`;
const timestamp = new Date().toISOString();

// 3. Output Base Folder: dist_releases/
const baseDistDir = path.join(rootDir, 'dist_releases');
const versionFolder = path.join(baseDistDir, `v${version}`);
const buildFolder = path.join(baseDistDir, 'build_history', buildKey);

// Create folder structure
const targetFolders = [versionFolder, buildFolder];
targetFolders.forEach(folder => {
  ['portable', 'installer', 'unpacked', 'mobile'].forEach(sub => {
    fs.mkdirSync(path.join(folder, sub), { recursive: true });
  });
});

console.log(`📂 Output Root Folder: dist_releases/`);
console.log(`   ├── 📁 v${version}/ (Latest for v${version})`);
console.log(`   └── 📁 build_history/${buildKey}/ (Sequence Build #${currentBuildNumber})\n`);

// Helper: Calculate SHA256
function getFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

// Helper: Copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// =====================================================================
// STEP 1: Build Frontend Assets (Vite)
// =====================================================================
console.log(`📦 [1/5] Building Web Front-End (Vite)...`);
if (!fs.existsSync(path.join(rootDir, 'dist', 'index.html')) || process.env.FORCE_REBUILD === '1') {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} else {
  console.log(`   - [OK] Front-end Web UI bundle (dist/index.html) verified & ready.`);
}

// =====================================================================
// STEP 2: Generate Mobile PWA & Android APK Packages
// =====================================================================
console.log(`\n📱 [2/5] Packaging Mobile PWA and Android APK...`);
try {
  execSync('node scripts/package-mobile.js', { cwd: rootDir, stdio: 'inherit' });
  execSync('node scripts/package-android.js', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn(`   - Mobile packaging notice: ${e.message}`);
}

const pwaZipName = `Grid_IP_Scanner2_v${version}_Mobile_PWA.zip`;
const apkName = `Grid_IP_Scanner2_v${version}.apk`;
const rootPwaZip = path.join(rootDir, pwaZipName);
const rootApk = path.join(rootDir, apkName);

targetFolders.forEach(folder => {
  const mobileDir = path.join(folder, 'mobile');
  if (fs.existsSync(rootPwaZip)) fs.copyFileSync(rootPwaZip, path.join(mobileDir, pwaZipName));
  if (fs.existsSync(rootApk)) fs.copyFileSync(rootApk, path.join(mobileDir, apkName));
});

// =====================================================================
// STEP 3: Assemble Unpacked Multi-File Application Directory
// =====================================================================
console.log(`\n📂 [3/5] Assembling Unpacked Multi-File Directory...`);
const exeName = `Grid IP Scanner2 v${version}.exe`;
const rootExe = path.join(rootDir, exeName);

targetFolders.forEach(folder => {
  const unpackedDir = path.join(folder, 'unpacked');
  
  // 1. Copy Executable if built, else placeholder
  if (fs.existsSync(rootExe)) {
    fs.copyFileSync(rootExe, path.join(unpackedDir, exeName));
    fs.copyFileSync(rootExe, path.join(unpackedDir, 'Grid_IP_Scanner2.exe'));
    
    // Also copy to portable folder
    fs.copyFileSync(rootExe, path.join(folder, 'portable', exeName));
  }

  // 2. Copy databases & configuration files
  ['master_oui.txt', 'winres.json', 'package.json', 'icon.ico', 'icon.png'].forEach(f => {
    const src = path.join(rootDir, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(unpackedDir, f));
  });
  if (fs.existsSync(path.join(rootDir, 'public', 'logo.png'))) {
    fs.copyFileSync(path.join(rootDir, 'public', 'logo.png'), path.join(unpackedDir, 'logo.png'));
  }
  if (fs.existsSync(path.join(rootDir, 'docs', 'LICENSE.md'))) {
    fs.copyFileSync(path.join(rootDir, 'docs', 'LICENSE.md'), path.join(unpackedDir, 'LICENSE.md'));
  }

  // 3. Copy sub-directories
  copyDir(path.join(rootDir, 'dist'), path.join(unpackedDir, 'dist'));
  copyDir(path.join(rootDir, 'public'), path.join(unpackedDir, 'public'));
  copyDir(path.join(rootDir, 'docs'), path.join(unpackedDir, 'docs'));
  copyDir(path.join(rootDir, 'scripts'), path.join(unpackedDir, 'scripts'));
});
console.log(`   - [OK] Unpacked Multi-File folder created with individual constituent files.`);

// =====================================================================
// STEP 4: Build Official Inno Setup Multi-File Installer
// =====================================================================
console.log(`\n🔨 [4/5] Building Inno Setup Multi-File Installer...`);
try {
  execSync('node installer/build-installer.js', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn(`   - Inno Setup notice: ${e.message}`);
}

const installerName = `Grid_IP_Scanner2_v${version}_Setup.exe`;
const rootInstaller = path.join(rootDir, 'dist_installer', installerName);

targetFolders.forEach(folder => {
  const instDir = path.join(folder, 'installer');
  if (fs.existsSync(rootInstaller)) {
    fs.copyFileSync(rootInstaller, path.join(instDir, installerName));
  }
  // Copy Inno Setup script and builder for reference / manual compilation
  if (fs.existsSync(path.join(rootDir, 'installer', 'Grid_IP_Scanner2_Setup.iss'))) {
    fs.copyFileSync(path.join(rootDir, 'installer', 'Grid_IP_Scanner2_Setup.iss'), path.join(instDir, 'Grid_IP_Scanner2_Setup.iss'));
  }
  if (fs.existsSync(path.join(rootDir, 'installer', 'build-installer.js'))) {
    fs.copyFileSync(path.join(rootDir, 'installer', 'build-installer.js'), path.join(instDir, 'build-installer.js'));
  }
});

// =====================================================================
// STEP 5: Generate Detailed Build Manifest (SHA256 & Metadata)
// =====================================================================
console.log(`\n📋 [5/5] Generating Build Manifest & Checksums...`);
const manifest = {
  product: 'Grid IP Scanner2',
  version: version,
  buildNumber: currentBuildNumber,
  buildKey: buildKey,
  timestamp: timestamp,
  author: 'AhBiYout',
  publisher: 'Cisnet (www.cisnet.co.kr)',
  repository: 'https://github.com/AhBiYout/grid-ip-scanner2',
  unpackedStructure: {
    rootExecutables: [exeName, 'Grid_IP_Scanner2.exe'],
    dataFiles: ['master_oui.txt', 'winres.json', 'package.json', 'LICENSE.md'],
    assetFiles: ['icon.ico', 'icon.png', 'logo.png'],
    directories: ['dist/', 'public/', 'docs/', 'scripts/']
  },
  firewallRules: [
    { name: 'Grid IP Scanner2', direction: 'in', protocol: 'any' },
    { name: 'Grid IP Scanner2 (Inbound)', direction: 'in', protocol: 'any' },
    { name: 'Grid IP Scanner2 (Outbound)', direction: 'out', protocol: 'any' },
    { name: `Grid IP Scanner2 v${version}`, direction: 'in', protocol: 'any' },
    { name: `Grid IP Scanner2 v${version} (Inbound)`, direction: 'in', protocol: 'any' },
    { name: `Grid IP Scanner2 v${version} (Outbound)`, direction: 'out', protocol: 'any' }
  ],
  artifacts: {
    installer: {
      filename: installerName,
      sha256: getFileSha256(path.join(versionFolder, 'installer', installerName)),
      sizeBytes: fs.existsSync(path.join(versionFolder, 'installer', installerName)) ? fs.statSync(path.join(versionFolder, 'installer', installerName)).size : 0
    },
    portableExe: {
      filename: exeName,
      sha256: getFileSha256(path.join(versionFolder, 'portable', exeName)),
      sizeBytes: fs.existsSync(path.join(versionFolder, 'portable', exeName)) ? fs.statSync(path.join(versionFolder, 'portable', exeName)).size : 0
    },
    mobilePwaZip: {
      filename: pwaZipName,
      sha256: getFileSha256(path.join(versionFolder, 'mobile', pwaZipName)),
      sizeBytes: fs.existsSync(path.join(versionFolder, 'mobile', pwaZipName)) ? fs.statSync(path.join(versionFolder, 'mobile', pwaZipName)).size : 0
    },
    androidApk: {
      filename: apkName,
      sha256: getFileSha256(path.join(versionFolder, 'mobile', apkName)),
      sizeBytes: fs.existsSync(path.join(versionFolder, 'mobile', apkName)) ? fs.statSync(path.join(versionFolder, 'mobile', apkName)).size : 0
    }
  }
};

targetFolders.forEach(folder => {
  fs.writeFileSync(path.join(folder, 'build_manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
});

// Update build history
buildHistory.builds[buildKey] = {
  version,
  timestamp,
  artifacts: manifest.artifacts
};
fs.writeFileSync(buildsTrackingFile, JSON.stringify(buildHistory, null, 2) + '\n', 'utf8');

console.log(`\n======================================================`);
console.log(`🎉 Distribution Packaging Complete!`);
console.log(`   📁 Version Folder : dist_releases/v${version}/`);
console.log(`   📁 Sequence Folder: dist_releases/build_history/${buildKey}/`);
console.log(`======================================================\n`);
