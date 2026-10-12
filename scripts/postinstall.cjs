#!/usr/bin/env node
/**
 * Post-install script for Termux compatibility
 * Automatically configures permissions and checks requirements
 * Wrapped in try-catch to prevent blocking npm install on any platform
 */

try {
  const fs = require('fs');
  const path = require('path');

  const isTermux = process.env.TERMUX_VERSION !== undefined ||
                   (process.env.PREFIX && process.env.PREFIX.includes('com.termux'));

  const root = path.join(__dirname, '..');
  const bundlePath = path.join(root, 'bundle', 'luxyie.cjs');

  // Fix permissions automatically
  try {
    if (fs.existsSync(bundlePath)) {
      fs.chmodSync(bundlePath, '755');
      console.log('Luxyie AI CLI: Bundle permissions set to 755');
    }
  } catch (permError) {
    // Silent fail for permissions
  }

  if (isTermux) {
    // Ensure the config directory exists so the first run cannot fail on a
    // read-only or missing home.
    try {
      const home = require('os').homedir();
      const configDir = path.join(home, '.luxyie');
      fs.mkdirSync(configDir, { recursive: true });
    } catch {
      // Silent fail: ConfigManager also creates this on demand
    }

    console.log('');
    console.log('Luxyie AI CLI - Termux detected');
    console.log('  Optional but recommended for web tools: pkg install chromium');
    console.log('  Optional clipboard support:              pkg install termux-api');
    console.log('  Run "npm run doctor" for a full environment check.');
    console.log('');
  }
} catch (error) {
  // Fail silently to never block installation
  // console.warn('Luxyie AI CLI post-install warning:', error.message);
}
