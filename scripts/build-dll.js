/**
 * Grid IP Scanner2 - Native Dynamic Link Library (DLL) Build Orchestrator
 * Copyright (c) 2025-2026 AhBiYout (Cisnet). All rights reserved.
 * 
 * Compiles `grid_net_driver.dll` using GCC, Clang, or Go c-shared compiler
 * and distributes it to the application root and installer payload directories.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Grid IP Scanner2 - Native DLL Build Orchestrator Started');

const rootDir = path.resolve(__dirname, '..');
const nativeDllDir = path.join(rootDir, 'native_dll');
const cSource = path.join(nativeDllDir, 'grid_net_driver.c');
const goSource = path.join(nativeDllDir, 'grid_net_driver.go');
const targetDll = path.join(rootDir, 'grid_net_driver.dll');

let compiled = false;

// 1. Try GCC / Clang (MinGW-w64 or MSVC)
if (fs.existsSync(cSource)) {
  const compilers = ['gcc', 'clang', 'x86_64-w64-mingw32-gcc'];
  for (const cc of compilers) {
    try {
      console.log(`   - Testing C compiler: ${cc}...`);
      execSync(`${cc} --version`, { stdio: 'ignore' });
      const cmd = `${cc} -shared -O3 -DBUILDING_GRID_NET_DRIVER "${cSource}" -o "${targetDll}" -lws2_32 -liphlpapi`;
      console.log(`> Executing: ${cmd}`);
      execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
      if (fs.existsSync(targetDll)) {
        console.log(`✅ [OK] Successfully compiled grid_net_driver.dll via ${cc}!`);
        compiled = true;
        break;
      }
    } catch (e) {
      // Continue to next compiler
    }
  }
}

// 2. Try Go c-shared mode if GCC/Clang was not available
if (!compiled && fs.existsSync(goSource)) {
  try {
    console.log('   - Testing Go compiler for c-shared mode...');
    execSync('go version', { stdio: 'ignore' });
    const cmd = `go build -buildmode=c-shared -o "${targetDll}" "${goSource}"`;
    console.log(`> Executing: ${cmd}`);
    execSync(cmd, { cwd: nativeDllDir, env: { ...process.env, CGO_ENABLED: '1' }, stdio: 'inherit' });
    if (fs.existsSync(targetDll)) {
      console.log(`✅ [OK] Successfully compiled grid_net_driver.dll via Go c-shared mode!`);
      compiled = true;
    }
  } catch (e) {
    console.warn('   - Notice: Go c-shared compilation skipped (CGO requirements not met).');
  }
}

// 3. Fallback: If no compiler was available on this runner, ensure fallback structure
if (!compiled) {
  if (fs.existsSync(targetDll)) {
    console.log(`ℹ️ Using existing pre-built grid_net_driver.dll in root directory.`);
  } else {
    console.log(`⚠️ Notice: Pre-built grid_net_driver.dll not found in current environment.`);
    console.log(`   Application will safely utilize native Win32/Iphlpapi LazyDLL fallback.`);
  }
}

// 4. Distribute DLL to winres/ and release folders if present
if (fs.existsSync(targetDll)) {
  const winresDir = path.join(rootDir, 'winres');
  if (fs.existsSync(winresDir)) {
    fs.copyFileSync(targetDll, path.join(winresDir, 'grid_net_driver.dll'));
  }
  const distInstaller = path.join(rootDir, 'dist_installer');
  if (fs.existsSync(distInstaller)) {
    fs.copyFileSync(targetDll, path.join(distInstaller, 'grid_net_driver.dll'));
  }
  console.log(`📦 Synced grid_net_driver.dll to distribution assets.`);
}

console.log('✨ Native DLL Orchestrator execution complete!\n');
