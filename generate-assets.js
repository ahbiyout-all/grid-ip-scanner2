const fs = require('fs');
const path = require('path');

// Helper to ensure target directories exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Helper to copy file if source exists
function safeCopy(src, dest) {
  if (fs.existsSync(src)) {
    ensureDirectoryExistence(dest);
    try {
      fs.copyFileSync(src, dest);
      console.log(`   - [OK] Copied ${src} -> ${dest}`);
      return true;
    } catch (err) {
      console.error(`   - [FAIL] Failed to copy ${src} -> ${dest}:`, err.message);
      return false;
    }
  } else {
    console.warn(`   - [SKIP] Source file ${src} does not exist.`);
    return false;
  }
}

async function runGenerator() {
  console.log('\n🎨 Starting automatic asset generator...');

  const pngSource = 'Grid IP Scanner2.png';
  const icoSource = 'Grid IP Scanner2.ico';

  // 1. Ensure public and dist directories exist
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
  }
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // 2. Process Logo/Image Assets
  if (fs.existsSync(pngSource)) {
    safeCopy(pngSource, 'public/logo.png');
    safeCopy(pngSource, 'dist/logo.png');
    safeCopy(pngSource, 'icon.png');
    
    // Ensure 256x256 PNG exists for go-winres
    if (!fs.existsSync('icon_256.png')) {
      safeCopy(pngSource, 'icon_256.png');
    }
  } else {
    console.warn(`⚠️ Warning: Primary logo source (${pngSource}) not found!`);
  }

  // 3. Process ICO/Icon Assets
  let icoCopied = false;

  // Prefer the master Grid IP Scanner2.ico if available (has full 6 layers up to 256x256)
  if (fs.existsSync(icoSource)) {
    console.log(`   - Copying master multi-resolution icon (${icoSource}) with up to 256x256 desktop layers...`);
    const targets = [
      'icon.ico',
      'public/icon.ico',
      'public/favicon.ico',
      'dist/icon.ico',
      'dist/favicon.ico'
    ];
    targets.forEach(target => {
      ensureDirectoryExistence(target);
      safeCopy(icoSource, target);
    });
    icoCopied = true;
  }

  // Fallback if master .ico is not found: generate via png-to-ico
  if (!icoCopied && fs.existsSync(pngSource)) {
    try {
      console.log(`   - Converting ${pngSource} to standard multi-res ICO via png-to-ico...`);
      const pngToIco = require('png-to-ico');
      const convertFn = pngToIco.default || pngToIco;
      const buf = await convertFn(pngSource);

      const targets = [
        'icon.ico',
        'public/icon.ico',
        'public/favicon.ico',
        'dist/icon.ico',
        'dist/favicon.ico'
      ];

      targets.forEach(target => {
        ensureDirectoryExistence(target);
        fs.writeFileSync(target, buf);
        console.log(`   - [OK] Generated standard ICO -> ${target}`);
      });
      icoCopied = true;
    } catch (err) {
      console.warn(`⚠️ Conversion from PNG failed: ${err.message}`);
    }
  }

  console.log('✅ Asset generation step complete!\n');
}

// Run if called directly
if (require.main === module) {
  runGenerator().catch(err => {
    console.error('❌ Asset generation encountered a critical error:', err);
    process.exit(1);
  });
}

module.exports = runGenerator;
