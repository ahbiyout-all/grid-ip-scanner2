const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const isCli = require.main === module || (process.argv[1] && process.argv[1].endsWith('generate-assets.js'));

// Helper to ensure target directories exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
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

// Bilinear interpolation scaler for crisp downsampling/upsampling
function resizeBilinear(srcPng, targetWidth, targetHeight) {
  const dst = new PNG({ width: targetWidth, height: targetHeight });
  const xRatio = (srcPng.width - 1) / (targetWidth - 1 || 1);
  const yRatio = (srcPng.height - 1) / (targetHeight - 1 || 1);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const gx = x * xRatio;
      const gy = y * yRatio;
      const gxi = Math.floor(gx);
      const gyi = Math.floor(gy);
      const fx = gx - gxi;
      const fy = gy - gyi;
      const fx1 = 1 - fx;
      const fy1 = 1 - fy;

      const idx00 = (gyi * srcPng.width + gxi) * 4;
      const idx10 = (gyi * srcPng.width + Math.min(gxi + 1, srcPng.width - 1)) * 4;
      const idx01 = (Math.min(gyi + 1, srcPng.height - 1) * srcPng.width + gxi) * 4;
      const idx11 = (Math.min(gyi + 1, srcPng.height - 1) * srcPng.width + Math.min(gxi + 1, srcPng.width - 1)) * 4;

      const dstIdx = (y * targetWidth + x) * 4;
      for (let c = 0; c < 4; c++) {
        dst.data[dstIdx + c] = Math.round(
          (srcPng.data[idx00 + c] * fx1 + srcPng.data[idx10 + c] * fx) * fy1 +
          (srcPng.data[idx01 + c] * fx1 + srcPng.data[idx11 + c] * fx) * fy
        );
      }
    }
  }
  return dst;
}

// Crop transparent padding around icon graphic so it fills the boundary edge-to-edge
function trimAndSquare(srcPng) {
  let minX = srcPng.width, maxX = 0, minY = srcPng.height, maxY = 0;
  for (let y = 0; y < srcPng.height; y++) {
    for (let x = 0; x < srcPng.width; x++) {
      const a = srcPng.data[(y * srcPng.width + x) * 4 + 3];
      if (a > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no opaque pixels found, return original
  if (minX > maxX || minY > maxY) {
    return srcPng;
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const size = Math.max(w, h);

  const trimmed = new PNG({ width: size, height: size });
  trimmed.data.fill(0);

  const offsetX = Math.floor((size - w) / 2);
  const offsetY = Math.floor((size - h) / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = ((minY + y) * srcPng.width + (minX + x)) * 4;
      const dstIdx = ((offsetY + y) * size + (offsetX + x)) * 4;
      trimmed.data[dstIdx] = srcPng.data[srcIdx];
      trimmed.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      trimmed.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      trimmed.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }

  return trimmed;
}

// Pure standard multi-resolution ICO file generator (Windows 16x16 up to 256x256)
function createMultiResIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let totalSize = headerSize;
  for (const item of pngBuffers) {
    totalSize += item.buf.length;
  }

  const out = Buffer.alloc(totalSize);
  // Header: Reserved (0), Type (1 = Icon), Count
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);

  let currentOffset = headerSize;
  for (let i = 0; i < count; i++) {
    const item = pngBuffers[i];
    const dirOffset = 6 + i * 16;
    out.writeUInt8(item.width >= 256 ? 0 : item.width, dirOffset);
    out.writeUInt8(item.height >= 256 ? 0 : item.height, dirOffset + 1);
    out.writeUInt8(0, dirOffset + 2); // Color palette count
    out.writeUInt8(0, dirOffset + 3); // Reserved
    out.writeUInt16LE(1, dirOffset + 4); // Planes
    out.writeUInt16LE(32, dirOffset + 6); // Bits per pixel
    out.writeUInt32LE(item.buf.length, dirOffset + 8); // Image size in bytes
    out.writeUInt32LE(currentOffset, dirOffset + 12); // File offset

    item.buf.copy(out, currentOffset);
    currentOffset += item.buf.length;
  }

  return out;
}

async function runGenerator() {
  console.log('\n🎨 Starting automatic asset generator (Edge-to-Edge Optimized)...');

  const pngSource = 'Grid IP Scanner2.png';

  // 1. Ensure public, dist, and winres directories exist
  ['public', 'dist', 'winres'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 2. Process Logo/Image Assets with Auto-Trim
  if (fs.existsSync(pngSource)) {
    console.log(`   - Processing ${pngSource} with transparent boundary trimming...`);
    const rawPng = PNG.sync.read(fs.readFileSync(pngSource));
    const trimmed = trimAndSquare(rawPng);
    console.log(`   - Cropped icon to active visual square: ${trimmed.width}x${trimmed.height}`);

    // Generate high-res 512x512 logo
    const png512 = resizeBilinear(trimmed, 512, 512);
    const buf512 = PNG.sync.write(png512);
    fs.writeFileSync('public/logo.png', buf512);
    fs.writeFileSync('icon.png', buf512);
    fs.writeFileSync('winres/icon.png', buf512);
    console.log('   - [OK] Saved trimmed 512x512: public/logo.png, icon.png, winres/icon.png');

    // Generate crisp 256x256 icon for Windows resource embedding
    const png256 = resizeBilinear(trimmed, 256, 256);
    const buf256 = PNG.sync.write(png256);
    fs.writeFileSync('icon_256.png', buf256);
    fs.writeFileSync('winres/icon_256.png', buf256);
    console.log('   - [OK] Saved trimmed 256x256: icon_256.png, winres/icon_256.png');

    // 3. Generate multi-resolution Windows ICO (256, 128, 64, 48, 32, 16)
    try {
      console.log('   - Generating clean multi-resolution Windows ICO (256, 128, 64, 48, 32, 16)...');
      const icoSizes = [256, 128, 64, 48, 32, 16];
      const buffers = icoSizes.map(s => {
        const scaled = s === 256 ? png256 : resizeBilinear(trimmed, s, s);
        return { width: s, height: s, buf: PNG.sync.write(scaled) };
      });
      const icoBuf = createMultiResIco(buffers);

      const targets = [
        'icon.ico',
        'Grid IP Scanner2.ico',
        'winres/icon.ico',
        'public/icon.ico',
        'public/favicon.ico',
        'installer/icon.ico'
      ];

      targets.forEach(t => {
        ensureDirectoryExistence(t);
        fs.writeFileSync(t, icoBuf);
      });
      console.log('   - [OK] Successfully generated multi-layer ICO across all targets.');
    } catch (icoErr) {
      console.warn('   - Warning: ICO generation warning:', icoErr.message);
    }
  } else {
    console.warn(`⚠️ Warning: Primary logo source (${pngSource}) not found!`);
  }

  // 4. Synchronize winres.json to winres/winres.json
  if (fs.existsSync('winres.json')) {
    safeCopy('winres.json', 'winres/winres.json');
  }

  console.log('✅ Asset generation step complete!\n');
  if (isCli) {
    process.exit(0);
  }
}

// Run if called directly from CLI
if (isCli) {
  runGenerator().catch(err => {
    console.error('❌ Asset generation encountered a critical error:', err);
    process.exit(1);
  });
}

module.exports = runGenerator;
