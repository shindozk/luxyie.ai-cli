#!/usr/bin/env node
/**
 * Termux Permission Fix Utility
 * Run this if Luxyie CLI has permission issues on Termux
 * 
 * Usage: npx luxyie-fix-termux
 * Or:    node scripts/fix-termux-permissions.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('');
console.log('🔧 Luxyie AI CLI - Termux Permission Fix');
console.log('═'.repeat(50));
console.log('');

// Detect Termux
const isTermux = process.env.TERMUX_VERSION !== undefined || 
                 process.env.PREFIX?.includes('com.termux');

if (!isTermux) {
  console.log('ℹ️  Not running in Termux environment');
  console.log('   This script is only needed for Termux on Android');
  process.exit(0);
}

console.log('📱 Termux detected');
console.log('');

// Fix bundle permissions
const bundlePath = path.join(__dirname, '..', 'bundle', 'luxyie.cjs');

if (fs.existsSync(bundlePath)) {
  try {
    fs.chmodSync(bundlePath, '755');
    console.log('✅ Bundle permissions fixed (755)');
  } catch (error) {
    console.log('❌ Failed to fix bundle permissions');
    console.log(`   Error: ${error.message}`);
    console.log('');
    console.log('   Try running manually:');
    console.log(`   chmod +x ${bundlePath}`);
    process.exit(1);
  }
} else {
  console.log('⚠️  Bundle file not found');
  console.log('   Make sure Luxyie is installed correctly');
  process.exit(1);
}

// Check Node.js version
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  
  if (majorVersion >= 20) {
    console.log(`✅ Node.js ${nodeVersion} (compatible)`);
  } else {
    console.log(`⚠️  Node.js ${nodeVersion} (upgrade recommended)`);
    console.log('   Run: pkg install nodejs-lts');
  }
} catch (error) {
  console.log('❌ Node.js not found');
  console.log('   Run: pkg install nodejs-lts');
}

// Check Chromium
try {
  execSync('which chromium-browser', { encoding: 'utf8' });
  console.log('✅ Chromium detected (web features available)');
} catch (error) {
  console.log('ℹ️  Chromium not installed (web features disabled)');
  console.log('   To enable web features: pkg install chromium');
}

// Check storage permissions
try {
  const storagePath = '/storage/emulated/0';
  if (fs.existsSync(storagePath)) {
    console.log('✅ Storage access granted');
  } else {
    console.log('⚠️  Storage access not granted');
    console.log('   Run: termux-setup-storage');
  }
} catch (error) {
  // Silent fail
}

console.log('');
console.log('═'.repeat(50));
console.log('🎉 Permission fix complete!');
console.log('');
console.log('Try running Luxyie:');
console.log('   luxyie chat');
console.log('');

process.exit(0);
