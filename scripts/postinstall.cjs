#!/usr/bin/env node
/**
 * Post-install script for Termux compatibility
 * Automatically configures permissions and checks requirements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isTermux = process.env.TERMUX_VERSION !== undefined || 
                 process.env.PREFIX?.includes('com.termux');

const bundlePath = path.join(__dirname, '..', 'bundle', 'luxyie.cjs');

console.log('');

// Check if running in Termux
if (isTermux) {
  console.log('📱 Termux environment detected');
  
  // Fix permissions automatically
  try {
    if (fs.existsSync(bundlePath)) {
      fs.chmodSync(bundlePath, '755');
      console.log('✅ Bundle permissions set to 755');
    }
  } catch (error) {
    // Silent fail - user can manually chmod if needed
  }

  // Check if node is available
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log(`✅ Node.js ${nodeVersion} detected`);
  } catch (error) {
    console.log('⚠️  Node.js not found in PATH');
    console.log('   Run: pkg install nodejs-lts');
  }

  // Check for chromium (optional, for web features)
  try {
    execSync('which chromium-browser', { encoding: 'utf8' });
    console.log('✅ Chromium detected (web features available)');
  } catch (error) {
    console.log('ℹ️  Chromium not detected (web features disabled)');
    console.log('   To enable: pkg install chromium');
  }

  console.log('');
  console.log('🎉 Luxyie AI CLI installed successfully!');
  console.log('');
  console.log('📝 Quick start:');
  console.log('   luxyie chat        # Start interactive chat');
  console.log('   luxyie ask <q>     # Ask a quick question');
  console.log('   luxyie --help      # Show all commands');
  console.log('');
} else {
  // Non-Termux environment
  try {
    if (fs.existsSync(bundlePath)) {
      fs.chmodSync(bundlePath, '755');
    }
  } catch (error) {
    // Silent fail
  }
}

// Check Node.js version (require >= 20)
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  
  if (majorVersion < 20) {
    console.log('⚠️  Node.js 20+ is required');
    console.log(`   Current version: ${nodeVersion}`);
    console.log('   Please upgrade Node.js for full compatibility');
  }
} catch (error) {
  // Silent fail
}

process.exit(0);
