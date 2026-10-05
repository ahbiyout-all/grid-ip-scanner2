/**
 * Grid IP Scanner2 - Automated Windows Installer Build Orchestrator
 * Parses version from docs/PATCH_NOTE.md and compiles official Inno Setup installer
 * or generates standalone Windows GUI Setup.exe fallback.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Grid IP Scanner2 - Installer Packaging Pipeline Initialized');

// 1. Resolve current version from package.json or docs/PATCH_NOTE.md
let version = '2.3.2';
const pkgPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) version = pkg.version;
  } catch (e) {}
} else {
  const patchNotePath = path.join(__dirname, '..', 'docs', 'PATCH_NOTE.md');
  if (fs.existsSync(patchNotePath)) {
    const content = fs.readFileSync(patchNotePath, 'utf8');
    const match = content.match(/#\s*Grid IP Scanner2\s*-\s*Patch Note\s*\(v?([0-9.]+)\)/i) || content.match(/\(v([0-9.]+)\)/i);
    if (match && match[1]) {
      version = match[1];
    }
  }
}
console.log(`📌 Target Product Version: v${version}`);

// 2. Ensure dist_installer folder exists
const rootDir = path.join(__dirname, '..');
const distInstallerDir = path.join(rootDir, 'dist_installer');
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
const localAppData = process.env.LOCALAPPDATA || '';
const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
const programFiles = process.env.ProgramFiles || 'C:\\Program Files';

const defaultInnoPaths = [
  'iscc',
  path.join(programFilesX86, 'Inno Setup 6', 'ISCC.exe'),
  path.join(programFiles, 'Inno Setup 6', 'ISCC.exe'),
  path.join(programFilesX86, 'Inno Setup 5', 'ISCC.exe'),
  path.join(programFiles, 'Inno Setup 5', 'ISCC.exe'),
  path.join(localAppData, 'Programs', 'Inno Setup 6', 'ISCC.exe'),
  'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 6\\ISCC.exe'
];

let isccExe = null;
for (const p of defaultInnoPaths) {
  try {
    if (p === 'iscc' || fs.existsSync(p)) {
      execSync(`"${p}" /?`, { stdio: 'ignore' });
      isccExe = p;
      break;
    }
  } catch (e) {
    // continue
  }
}

const targetSetupExe = path.join(distInstallerDir, `Grid_IP_Scanner2_v${version}_Setup.exe`);

if (isccExe) {
  console.log(`🔨 Compiling official Inno Setup installer using ${isccExe}...`);
  try {
    execSync(`"${isccExe}" "${issPath}"`, { stdio: 'inherit' });
    console.log(`\n🎉 Official Inno Setup installer successfully built in dist_installer/!`);
  } catch (err) {
    console.warn('⚠️ Inno Setup compilation notice:', err.message);
  }
}

// Fallback: If ISCC didn't run or didn't generate targetSetupExe, build Standalone Setup.exe using Go
if (!fs.existsSync(targetSetupExe)) {
  console.log('\n🔨 Generating Standalone Windows Setup.exe Installer via Go compiler...');
  try {
    // Zip unpacked folder into payload.zip
    const payloadZip = path.join(__dirname, 'payload.zip');
    const unpackedDir = path.join(rootDir, 'dist_releases', `v${version}`, 'unpacked');
    
    // Fallback source if unpacked dir not yet populated
    const sourceDir = fs.existsSync(unpackedDir) ? unpackedDir : rootDir;
    
    // Create zip of files for installer payload via PowerShell
    const zipScript = `Add-Type -A 'System.IO.Compression.FileSystem'; [System.IO.Compression.ZipFile]::CreateFromDirectory('${sourceDir}', '${payloadZip}')`;
    if (fs.existsSync(payloadZip)) fs.unlinkSync(payloadZip);
    execSync(`powershell -NoProfile -Command "${zipScript}"`, { stdio: 'inherit' });

    // Compile setup_builder.go
    const setupGo = path.join(__dirname, 'setup_builder.go');
    execSync(`go build -ldflags="-s -w -H windowsgui" -o "${targetSetupExe}" "${setupGo}"`, { cwd: __dirname, stdio: 'inherit' });

    // Clean up temporary payload zip
    if (fs.existsSync(payloadZip)) fs.unlinkSync(payloadZip);

    console.log(`\n🎉 Standalone Windows Setup.exe successfully created: ${targetSetupExe}!`);
  } catch (e) {
    console.warn(`⚠️ Standalone Setup compiler notice: ${e.message}`);
  }
}
