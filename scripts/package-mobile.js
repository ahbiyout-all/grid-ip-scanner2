/**
 * Grid IP Scanner2 - Mobile Web & PWA Packaging Orchestrator
 * Packages the production web build into:
 * - Mobile Web & PWA Distribution Zip (Grid_IP_Scanner2_vX.Y.Z_Mobile_PWA.zip)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '2.3.2';

console.log(`📱 Packaging Grid IP Scanner2 Mobile & PWA v${version}...`);

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('   - Building web assets via npm run build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

// 1. Ensure PWA metadata & touch icons are in dist
const filesToCopy = [
  { src: 'public/manifest.json', dest: 'dist/manifest.json' },
  { src: 'public/logo.png', dest: 'dist/logo.png' },
  { src: 'public/favicon.ico', dest: 'dist/favicon.ico' },
  { src: 'public/icon.ico', dest: 'dist/icon.ico' }
];

filesToCopy.forEach(({ src, dest }) => {
  const srcPath = path.join(rootDir, src);
  const destPath = path.join(rootDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`   - [OK] Synced ${src} -> ${dest}`);
  }
});

// Helper to create zip archive cross-platform (PowerShell / Python / Zip)
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

// 2. Create Zip Bundle for Mobile PWA
const zipName = `Grid_IP_Scanner2_v${version}_Mobile_PWA.zip`;
const zipPath = path.join(rootDir, zipName);

if (createZip(distDir, zipPath)) {
  console.log(`✅ [OK] Created Mobile PWA Bundle: ${zipName} (${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB)`);
} else {
  console.warn(`⚠️ Warning: Failed to compress zip bundle`);
}

console.log(`\n🎉 Mobile packaging complete for v${version}!\n`);
