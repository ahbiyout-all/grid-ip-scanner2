
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

console.log('🚀 Grid IP Scanner2 - Windows Build Process Started');

// Helper to download a file with redirect support
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Handle redirect
          request(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

function run(cmd, env = {}) {
  try {
    console.log(`> Executing: ${cmd}`);
    execSync(cmd, { 
      stdio: 'inherit',
      env: { ...process.env, ...env }
    });
    return true;
  } catch (e) {
    console.error(`\n❌ Error executing: ${cmd}`);
    return false;
  }
}

async function startBuild() {
  try {
    // 0. Ensure Go is available
    console.log('\n⚙️ Step 0: Checking for Go compiler...');
    let goExe = 'go';
    let localGoDir = path.join(process.cwd(), 'go');
    let localGoExeWin = path.join(localGoDir, 'bin', 'go.exe');
    let localGoExeNix = path.join(localGoDir, 'bin', 'go');
    let localGoExe = fs.existsSync(localGoExeWin) ? localGoExeWin : (fs.existsSync(localGoExeNix) ? localGoExeNix : localGoExeWin);

    let hasGlobalGo = false;
    try {
      execSync('go version', { stdio: 'ignore' });
      hasGlobalGo = true;
      console.log('   - Global Go detected.');
    } catch (e) {}

    if (!hasGlobalGo) {
      if (fs.existsSync(localGoExe)) {
        goExe = localGoExe;
        console.log(`   - Using local Go: ${goExe}`);
      } else {
        console.log('   - Go not found. Downloading portable Go (approx 120MB)...');
        const goZip = path.join(process.cwd(), 'go.zip');
        // Go 1.22.1 Windows AMD64 Portable
        const goUrl = 'https://go.dev/dl/go1.22.1.windows-amd64.zip';
        
        try {
          if (!fs.existsSync(goZip)) {
            console.log('     Downloading...');
            await downloadFile(goUrl, goZip);
            console.log('     Download complete.');
          }
          
          console.log('     Extracting (this may take a minute)...');
          // Use a more robust PowerShell command for extraction
          // Also handle cases where the file might be locked or corrupt
          const extractCmd = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${goZip}', '${process.cwd()}')"`;
          
          try {
            execSync(extractCmd, { stdio: 'inherit' });
          } catch (psErr) {
            console.warn('     PowerShell extraction failed, trying fallback method...');
            // Fallback for older systems
            execSync(`powershell -Command "Expand-Archive -Path '${goZip}' -DestinationPath '${process.cwd()}' -Force"`, { stdio: 'inherit' });
          }
          
          if (fs.existsSync(localGoExe)) {
            goExe = localGoExe;
            console.log(`   - Local Go ready: ${goExe}`);
            try { fs.unlinkSync(goZip); } catch(e) {}
          } else {
            throw new Error('Extraction failed - go.exe not found after unzip');
          }
        } catch (err) {
          console.error(`\n❌ Failed to setup Go: ${err.message}`);
          console.error('   Note: If you see "File Corrupted", please delete go.zip and try again.');
          console.error('   Alternatively, install Go manually from https://go.dev/dl/');
          process.exit(1);
        }
      }
    }

    // 0.5. Generate Clean ICO & Logo Files from PNG and ICO sources
    console.log('\n🎨 Step 0.5: Executing automatic asset generator...');
    try {
      const runGenerator = require('./generate-assets');
      await runGenerator();
    } catch (icoErr) {
      console.warn('   - Warning: Failed to run asset generator module:', icoErr.message);
    }

    // 1. Vite Build
    console.log('\n📦 Step 1: Building Frontend (Vite)...');
    if (!run('npx vite build')) process.exit(1);

  // 2. Clean up old .syso files
  console.log('\n🧹 Step 2: Cleaning up old resource files...');
  const files = fs.readdirSync('.');
  let deletedCount = 0;
  files.forEach(file => {
    if (file.endsWith('.syso')) {
      try {
        fs.unlinkSync(file);
        deletedCount++;
      } catch (e) {}
    }
  });
  console.log(`   - Removed ${deletedCount} old resource files.`);

  // 3. Generate Windows Resources
  console.log('\n🎨 Step 3: Generating Windows resources (Icon & Metadata)...');
  
  // Ensure winres directory and files exist for standard go-winres make
  if (!fs.existsSync('winres')) {
    fs.mkdirSync('winres', { recursive: true });
  }
  if (fs.existsSync('winres.json')) {
    fs.copyFileSync('winres.json', 'winres/winres.json');
  }
  if (fs.existsSync('icon_256.png')) {
    fs.copyFileSync('icon_256.png', 'winres/icon_256.png');
  }
  if (fs.existsSync('icon.png')) {
    fs.copyFileSync('icon.png', 'winres/icon.png');
  }

  // Method A: Standard go-winres make (using winres/ directory)
  console.log('   - Running go-winres make...');
  let sysoGenerated = false;
  try {
    if (run(`"${goExe}" run github.com/tc-hib/go-winres@latest make`)) {
      const sysoFiles = fs.readdirSync('.').filter(f => f.endsWith('.syso'));
      if (sysoFiles.length > 0) {
        console.log(`   - [OK] Resource files compiled: ${sysoFiles.join(', ')}`);
        sysoGenerated = true;
      }
    }
  } catch (e) {}

  // Method B: Fallback go-winres simply
  if (!sysoGenerated) {
    console.log('   - Trying fallback: go-winres simply...');
    try {
      if (run(`"${goExe}" run github.com/tc-hib/go-winres@latest simply --icon icon_256.png --manifest gui`)) {
        const sysoFiles = fs.readdirSync('.').filter(f => f.endsWith('.syso'));
        if (sysoFiles.length > 0) {
          console.log(`   - [OK] Simply generated resource files: ${sysoFiles.join(', ')}`);
          sysoGenerated = true;
        }
      }
    } catch (e) {}
  }

  if (!sysoGenerated) {
    console.warn('⚠️ Warning: Initial .syso generation skipped. Will apply direct PE icon patch after Go build.');
  }

  // 4. Go Build & Version Tag Resolution
  const pkgPath = path.join(process.cwd(), 'package.json');
  let version = '2.2';
  let productName = 'Grid IP Scanner2';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) {
        version = pkg.version;
      }
      if (pkg.build && pkg.build.productName) {
        productName = pkg.build.productName;
      }
    } catch (e) {
      console.warn('⚠️ Warning: Failed to parse package.json for version, defaulting to 2.2');
    }
  }

  // Automatically check docs/PATCH_NOTE.md to pull exact version tag matching the patch notes
  const patchNotePath = path.join(process.cwd(), 'docs', 'PATCH_NOTE.md');
  if (fs.existsSync(patchNotePath)) {
    try {
      const patchContent = fs.readFileSync(patchNotePath, 'utf8');
      const patchMatch = patchContent.match(/#\s*Grid IP Scanner2\s*-\s*Patch Note\s*\(v?([0-9.]+)\)/i) || patchContent.match(/\(v([0-9.]+)\)/i);
      if (patchMatch && patchMatch[1]) {
        version = patchMatch[1];
        console.log(`   - Version tag resolved from Patch Note: v${version}`);
      }
    } catch (e) {
      console.warn('⚠️ Warning: Could not read version from docs/PATCH_NOTE.md');
    }
  }

  const exeName = `${productName} v${version}.exe`;
  console.log(`\n🔨 Step 4: Compiling Go binary (${exeName})...`);
  
  const customPort = process.env.VITE_PORT || "3031";
  console.log(`   - Injecting custom port: ${customPort}`);
  
  // Clean up any old versioned executable or GridIPScanner2.exe
  const filesInDir = fs.readdirSync('.');
  filesInDir.forEach(file => {
    const isOldExe = (file.startsWith(productName) && file.endsWith('.exe')) || file === 'GridIPScanner2.exe';
    if (isOldExe) {
      try {
        fs.unlinkSync(file);
        console.log(`   - Removed existing/old executable: ${file}`);
      } catch (e) {
        if (file === exeName) {
          console.error(`\n❌ Error: Cannot overwrite ${file}.`);
          console.error('   The application is likely currently running.');
          console.error(`   Please CLOSE the ${file} app and try building again.`);
          process.exit(1);
        } else {
          console.warn(`   - Warning: Could not remove old file ${file}: ${e.message}`);
        }
      }
    }
  });

  // Explicitly set GOOS and GOARCH to ensure .syso is picked up correctly
  const buildCmd = `"${goExe}" build -ldflags="-s -w -H windowsgui -X 'main.defaultPort=${customPort}'" -o "${exeName}" .`;
  if (!run(buildCmd, { GOOS: 'windows', GOARCH: 'amd64' })) process.exit(1);

  // 4.5. Secondary Icon Injection Guarantee (Direct PE binary patch)
  console.log(`\n🎨 Step 4.5: Verifying and embedding icon & metadata into ${exeName}...`);
  try {
    const patchTarget = fs.existsSync('winres/winres.json') ? 'winres/winres.json' : 'winres.json';
    const patchCmd = `"${goExe}" run github.com/tc-hib/go-winres@latest patch --in "${patchTarget}" "${exeName}"`;
    if (run(patchCmd)) {
      console.log(`   - [OK] Icon and PE version metadata verified & patched directly into ${exeName}!`);
    }
  } catch (patchErr) {
    console.warn(`   - Notice: Direct patch skipped (standard syso was embedded): ${patchErr.message}`);
  }

  console.log(`\n✅ Build Successful! ${exeName} is ready.`);
  
  // 5. Trigger automated multi-folder distribution pipeline
  console.log(`\n📦 Step 5: Orchestrating multi-folder distribution outputs...`);
  try {
    const distScript = path.join(process.cwd(), 'scripts', 'build-distribution.js');
    if (fs.existsSync(distScript)) {
      execSync(`node "${distScript}"`, { stdio: 'inherit' });
    }
  } catch (distErr) {
    console.warn(`   - Distribution packaging notice: ${distErr.message}`);
  }
} catch (error) {
  console.error('\n❌ Unexpected Build Error!');
  console.error(error.message);
  process.exit(1);
  }
}

startBuild();
