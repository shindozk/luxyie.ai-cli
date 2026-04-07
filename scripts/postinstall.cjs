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

  if (isTermux) {
    const bundlePath = path.join(__dirname, '..', 'bundle', 'luxyie.cjs');
    
    // Fix permissions automatically
    try {
      if (fs.existsSync(bundlePath)) {
        fs.chmodSync(bundlePath, '755');
        console.log('Luxyie AI CLI: Bundle permissions set to 755');
      }
    } catch (permError) {
      // Silent fail for permissions
    }
  }
} catch (error) {
  // Fail silently to never block installation
  // console.warn('Luxyie AI CLI post-install warning:', error.message);
}
