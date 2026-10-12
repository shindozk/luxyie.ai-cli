#!/usr/bin/env node
/**
 * Luxyie AI CLI - Environment Doctor
 *
 * Checks whether the current environment can run the CLI and reports what to
 * install for the missing optional pieces. It never mutates the system.
 *
 * Usage:
 *   npm run doctor
 *   node scripts/doctor.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const isTermux =
  process.env.TERMUX_VERSION !== undefined ||
  (process.env.PREFIX && process.env.PREFIX.includes('com.termux'));
const isAndroid = process.platform === 'android' || (process.platform === 'linux' && isTermux);
const binDir = isTermux && process.env.PREFIX ? `${process.env.PREFIX}/bin` : '/usr/local/bin';

const results = [];

function pass(message, hint) {
  results.push({ ok: true, message, hint });
}

function warn(message, hint) {
  results.push({ ok: false, level: 'warn', message, hint });
}

function fail(message, hint) {
  results.push({ ok: false, level: 'fail', message, hint });
}

function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

function checkNode() {
  const version = process.version;
  const major = Number.parseInt(version.slice(1).split('.')[0], 10);
  if (major >= 20) {
    pass(`Node.js ${version}`);
  } else if (major >= 18) {
    warn(`Node.js ${version} (below the required >=20)`, isTermux ? 'pkg install nodejs-lts' : 'Install Node.js 20 or newer');
  } else {
    fail(`Node.js ${version} is too old (required >=20)`, isTermux ? 'pkg install nodejs-lts' : 'Install Node.js 20 or newer');
  }
}

function checkPuppeteer() {
  try {
    require.resolve('puppeteer');
    pass('puppeteer installed (browser automation available)');
  } catch {
    if (isAndroid) {
      warn(
        'puppeteer not installed - web_search/web_fetch/web_viewer are disabled',
        'Optional. Install with: PUPPETEER_SKIP_DOWNLOAD=1 npm install puppeteer',
      );
    } else {
      warn(
        'puppeteer not installed - web_search/web_fetch/web_viewer are disabled',
        'Optional. Install with: npm install puppeteer',
      );
    }
  }
}

function checkChromium() {
  if (!isAndroid) {
    const bundled = fs.existsSync(
      path.join(process.cwd(), 'node_modules', 'puppeteer', '.local-chromium'),
    );
    if (bundled) {
      pass('Chromium bundled with puppeteer');
    }
    return;
  }

  const candidates = [
    process.env.CHROMIUM_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    `${binDir}/chromium-browser`,
    `${binDir}/chromium`,
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (found) {
    pass(`System Chromium found (${found})`);
  } else {
    warn(
      'Chromium not found - web_search/web_fetch/web_viewer are disabled',
      'pkg install chromium',
    );
  }
}

function checkClipboard() {
  if (!isTermux) {
    return;
  }
  if (fs.existsSync(path.join(binDir, 'termux-clipboard-set'))) {
    pass('termux-api clipboard available (/copy, /cp)');
  } else {
    warn('termux-api clipboard unavailable', 'pkg install termux-api');
  }
}

function checkStorage() {
  if (!isAndroid) {
    return;
  }
  if (fs.existsSync('/storage/emulated/0')) {
    pass('Shared storage access granted');
  } else {
    warn('Shared storage not granted', 'termux-setup-storage');
  }
}

function checkBundle() {
  const bundlePath = path.join(process.cwd(), 'bundle', 'luxyie.cjs');
  if (!fs.existsSync(bundlePath)) {
    return;
  }
  try {
    fs.accessSync(bundlePath, fs.constants.X_OK);
    pass('CLI bundle is executable');
  } catch {
    warn('CLI bundle is not executable', `chmod +x ${bundlePath}`);
  }
}

function checkFileUtility() {
  if (commandExists('file')) {
    pass('`file` utility present (image dimensions)');
  } else {
    warn(
      '`file` utility missing - PNG/GIF/BMP/WebP dimensions come from headers, others are skipped',
      'pkg install file',
    );
  }
}

function report() {
  const line = '='.repeat(64);
  console.log('');
  console.log(`${C.bold}${C.cyan}Luxyie AI CLI - Environment Doctor${C.reset}`);
  console.log(line);
  console.log(`Platform: ${process.platform} (${process.arch})`);
  if (isTermux) console.log(`Termux:   detected${isAndroid ? ' (Android)' : ''}`);
  console.log(`Home:     ${require('os').homedir()}`);
  console.log(line);
  console.log('');

  for (const result of results) {
    let icon;
    let color;
    if (result.ok) {
      icon = '[ok]  ';
      color = C.green;
    } else if (result.level === 'fail') {
      icon = '[FAIL]';
      color = C.red;
    } else {
      icon = '[warn]';
      color = C.yellow;
    }
    console.log(`  ${color}${icon}${C.reset} ${result.message}`);
    if (result.hint) {
      console.log(`         ${C.dim}-> ${result.hint}${C.reset}`);
    }
  }

  const failures = results.filter((r) => !r.ok && r.level === 'fail').length;
  const warnings = results.filter((r) => !r.ok && r.level === 'warn').length;

  console.log('');
  console.log(line);
  console.log(
    `${failures > 0 ? C.red : C.green}${failures} blocking issue(s)${C.reset}, ` +
      `${C.yellow}${warnings} optional warning(s)${C.reset}`,
  );

  if (failures === 0 && warnings === 0) {
    console.log(`${C.green}Everything looks good.${C.reset}`);
  }

  console.log('');
  if (isTermux) {
    console.log(`${C.dim}Termux quick start:${C.reset}`);
    console.log('  pkg update && pkg upgrade');
    console.log('  pkg install nodejs-lts git');
    console.log('  pkg install chromium        # optional: enables web tools');
    console.log('  pkg install termux-api      # optional: enables /copy');
    console.log('  npm install -g luxyie.ai-cli');
    console.log('  luxyie chat');
    console.log('');
  }

  process.exitCode = failures > 0 ? 1 : 0;
}

checkNode();
checkPuppeteer();
checkChromium();
checkClipboard();
checkStorage();
checkFileUtility();
checkBundle();
report();
