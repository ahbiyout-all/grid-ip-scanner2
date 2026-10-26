/**
 * Grid IP Scanner2 - Portable Packaging Script
 * Generates standalone Portable Executable and Portable ZIP package.
 * 
 * Copyright (c) 2025-2026 AhBiYout  All rights reserved.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '2.4.6';

console.log(`📦 Packaging Grid IP Scanner2 Portable Edition v${version}...`);

const exeName = `Grid IP Scanner2 v${version}.exe`;
const portableExeName = `Grid_IP_Scanner2_v${version}_Portable.exe`;
const portableZipName = `Grid_IP_Scanner2_v${version}_Portable.zip`;

const rootExe = path.join(rootDir, exeName);
const fallbackExe = path.join(rootDir, 'Grid_IP_Scanner2.exe');
const sourceExe = fs.existsSync(rootExe) ? rootExe : (fs.existsSync(fallbackExe) ? fallbackExe : null);

// Ensure dist output directory exists
const portableOutDir = path.join(rootDir, 'dist_releases', `v${version}`, 'portable');
const distInstallerDir = path.join(rootDir, 'dist_installer');
[portableOutDir, distInstallerDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Helper to create zip archive cross-platform
function createZip(sourceDir, targetZip) {
  if (fs.existsSync(targetZip)) {
    try { fs.unlinkSync(targetZip); } catch(e) {}
  }
  if (process.platform === 'win32') {
    try {
      execSync(`powershell -Command "Compress-Archive -Path '${sourceDir}/*' -DestinationPath '${targetZip}' -Force"`, { stdio: 'ignore' });
      if (fs.existsSync(targetZip)) return true;
    } catch(e) {}
  }
  try {
    const pyCmd = `python3 -c "import zipfile, os, sys; src, dst = sys.argv[1], sys.argv[2]; z = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED); [z.write(os.path.join(r, f), os.path.relpath(os.path.join(r, f), src)) for r, d, files in os.walk(src) for f in files]; z.close()" "${sourceDir}" "${targetZip}"`;
    execSync(pyCmd, { stdio: 'ignore' });
    if (fs.existsSync(targetZip)) return true;
  } catch(e) {}
  try {
    execSync(`cd "${sourceDir}" && zip -r "${targetZip}" ./*`, { stdio: 'ignore' });
    if (fs.existsSync(targetZip)) return true;
  } catch(e) {}
  return fs.existsSync(targetZip);
}

// 1. Copy portable executables if sourceExe is available
if (sourceExe) {
  const destPortableExe = path.join(portableOutDir, portableExeName);
  const destVersionedExe = path.join(portableOutDir, exeName);
  const destInstallerPortableExe = path.join(distInstallerDir, portableExeName);

  fs.copyFileSync(sourceExe, destPortableExe);
  fs.copyFileSync(sourceExe, destVersionedExe);
  fs.copyFileSync(sourceExe, destInstallerPortableExe);
  console.log(`   - [OK] Portable Executable created: ${portableExeName}`);
} else {
  console.warn(`   - [!] Source executable not found. Build binary first using npm run build:exe.`);
}

// 2. Create Portable ZIP package from unpacked directory if present
const unpackedDir = path.join(rootDir, 'dist_releases', `v${version}`, 'unpacked');
if (fs.existsSync(unpackedDir)) {
  const targetZipPath = path.join(portableOutDir, portableZipName);
  const installerZipPath = path.join(distInstallerDir, portableZipName);
  
  if (createZip(unpackedDir, targetZipPath)) {
    fs.copyFileSync(targetZipPath, installerZipPath);
    console.log(`   - [OK] Portable ZIP Archive created: ${portableZipName} (${(fs.statSync(targetZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);
  } else {
    console.warn(`   - [!] Could not create zip package.`);
  }
} else {
  console.warn(`   - [!] Unpacked directory missing: ${unpackedDir}`);
}

console.log(`\n✅ Portable packaging completed for v${version}!\n`);
