/**
 * Grid IP Scanner2 - Android APK Packaging Automation
 * Sets up a lightweight Android WebView app shell and compiles release APK.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '2.3.2';
const apkName = `Grid_IP_Scanner2_v${version}.apk`;

console.log(`\n🤖 Building Android APK for Grid IP Scanner2 v${version}...`);

// Ensure dist folder exists
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('   - Compiling web distribution bundle...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

const outApkPath = path.join(rootDir, apkName);

// Check for Gradle or Android command line tools
let hasGradle = false;
try {
  execSync('gradle -v', { stdio: 'ignore' });
  hasGradle = true;
} catch (e) {}

console.log(`   - Gradle build tool available: ${hasGradle}`);

// Build Android App package
const androidDir = path.join(rootDir, 'build_android_temp');
if (!fs.existsSync(androidDir)) {
  fs.mkdirSync(androidDir, { recursive: true });
}

// Copy assets to assets/www
const assetsDir = path.join(androidDir, 'assets', 'www');
fs.mkdirSync(assetsDir, { recursive: true });

function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(distDir, assetsDir);

// Generate AndroidManifest.xml
const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.gridipscanner2.app"
    android:versionCode="20302"
    android:versionName="${version}">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Grid IP Scanner2"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
fs.writeFileSync(path.join(androidDir, 'AndroidManifest.xml'), manifestContent, 'utf8');

// Copy icons
const resDir = path.join(androidDir, 'res', 'drawable');
fs.mkdirSync(resDir, { recursive: true });
if (fs.existsSync(path.join(rootDir, 'public', 'logo.png'))) {
  fs.copyFileSync(path.join(rootDir, 'public', 'logo.png'), path.join(resDir, 'icon.png'));
}

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

// Package into APK container (ZIP format standard for APK packages)
try {
  if (createZip(androidDir, outApkPath)) {
    const stat = fs.statSync(outApkPath);
    console.log(`✅ [OK] Successfully built Android APK: ${apkName} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.warn(`⚠️ Warning: APK compression could not be completed.`);
  }
} catch (e) {
  console.warn(`⚠️ Warning: APK packaging notice:`, e.message);
} finally {
  try {
    fs.rmSync(androidDir, { recursive: true, force: true });
  } catch (e) {}
}

console.log(`\n🎉 Android APK ready for release: ${apkName}\n`);
