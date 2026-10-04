/**
 * Grid IP Scanner2 - Automated Windows Installer Build Orchestrator
 * Parses version from docs/PATCH_NOTE.md and compiles installer/Grid_IP_Scanner2_Setup.iss using Inno Setup (ISCC).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Grid IP Scanner2 - Installer Packaging Pipeline Initialized');

// 1. Resolve current version from docs/PATCH_NOTE.md or package.json
let version = '2.2.3';
const patchNotePath = path.join(__dirname, '..', 'docs', 'PATCH_NOTE.md');
if (fs.existsSync(patchNotePath)) {
  const content = fs.readFileSync(patchNotePath, 'utf8');
  const match = content.match(/#\s*Grid IP Scanner2\s*-\s*Patch Note\s*\(v?([0-9.]+)\)/i) || content.match(/\(v([0-9.]+)\)/i);
  if (match && match[1]) {
    version = match[1];
  }
}
console.log(`📌 Target Product Version: v${version}`);

// 2. Ensure dist_installer folder exists
const distInstallerDir = path.join(__dirname, '..', 'dist_installer');
if (!fs.existsSync(distInstallerDir)) {
  fs.mkdirSync(distInstallerDir, { recursive: true });
}

// 3. Update version in Inno Setup script if needed
const issPath = path.join(__dirname, 'Grid_IP_Scanner2_Setup.iss');
if (fs.existsSync(issPath)) {
  let issContent = fs.readFileSync(issPath, 'utf8');
  issContent = issContent.replace(/#define MyAppVersion "[^"]*"/, `#define MyAppVersion "${version}"`);
  issContent = issContent.replace(/#define MyAppExeName "[^"]*"/, `#define MyAppExeName "Grid IP Scanner2 v${version}.exe"`);
  fs.writeFileSync(issPath, issContent, 'utf8');
  console.log('✅ Inno Setup script (.iss) version synchronized.');
}

// 4. Check for Inno Setup Compiler (ISCC) on system
const defaultInnoPaths = [
  'iscc',
  'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 6\\ISCC.exe'
];

let isccExe = null;
for (const p of defaultInnoPaths) {
  try {
    execSync(`"${p}" /?`, { stdio: 'ignore' });
    isccExe = p;
    break;
  } catch (e) {
    // continue
  }
}

if (isccExe) {
  console.log(`🔨 Compiling installer using ${isccExe}...`);
  try {
    execSync(`"${isccExe}" "${issPath}"`, { stdio: 'inherit' });
    console.log(`\n🎉 Installer successfully built in dist_installer/!`);
  } catch (err) {
    console.error('❌ Inno Setup compilation failed:', err.message);
    process.exit(1);
  }
} else {
  console.log('\nℹ️ Inno Setup Compiler (ISCC.exe) not found in system path.');
  console.log('   To compile the installer on Windows:');
  console.log('   1. Install Inno Setup 6 (https://jrsoftware.org/isdl.php)');
  console.log(`   2. Run command: iscc "${issPath}"`);
  console.log(`   3. Output will be generated in: dist_installer/Grid_IP_Scanner2_v${version}_Setup.exe\n`);
}
