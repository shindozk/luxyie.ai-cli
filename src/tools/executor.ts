import fs from 'fs-extra';
import * as fsp from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { FileHandle } from 'node:fs/promises';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Browser, Page } from 'puppeteer';
import type { ToolDefinition, Config } from '../types/index.js';
import { isAndroid, isWindows, getBinDir } from '../utils/platform.js';

const execAsync = promisify(exec);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type PuppeteerModule = typeof import('puppeteer');

let puppeteerModule: PuppeteerModule | null = null;
let puppeteerLoadError: Error | null = null;

/**
 * Lazily load puppeteer.
 *
 * Puppeteer is an optional dependency: its Chromium download is frequently
 * skipped or unavailable on Android/Termux. Loading it on demand keeps file,
 * shell, and web-fetch tools working when the browser stack is absent, and
 * yields a clear error only when a tool actually needs a browser.
 */
async function loadPuppeteer(): Promise<PuppeteerModule> {
  if (puppeteerModule) {
    return puppeteerModule;
  }
  if (puppeteerLoadError) {
    throw puppeteerLoadError;
  }

  try {
    const loaded = (await import('puppeteer')) as PuppeteerModule & { default?: PuppeteerModule };
    puppeteerModule = (loaded.default ?? loaded) as PuppeteerModule;
    return puppeteerModule;
  } catch (error) {
    puppeteerLoadError =
      error instanceof Error
        ? error
        : new Error('Puppeteer is not installed. Install it with: npm install puppeteer');
    throw puppeteerLoadError;
  }
}

function findChromiumBinary(): string | null {
  if (!isAndroid()) {
    return null;
  }

  const candidates = [
    process.env.CHROMIUM_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    `${process.env.PREFIX ?? ''}/bin/chromium-browser`,
    `${process.env.PREFIX ?? ''}/bin/chromium`,
    '/data/data/com.termux/files/usr/bin/chromium-browser',
    '/data/data/com.termux/files/usr/bin/chromium',
    '/data/data/com.termux/files/usr/bin/google-chrome',
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

interface ToolExecutorOptions {
  workingDirectory?: string;
  config?: Config;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Lists files and directories in a given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The directory path to list.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads the content of a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The file path to read.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Writes content to a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The file path to write to.' },
          content: { type: 'string', description: 'The content to write.' },
        },
        required: ['path', 'content'],
      },
    },
    requiresConfirmation: true,
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Executes a shell command in the terminal.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to run.' },
        },
        required: ['command'],
      },
    },
    requiresConfirmation: true,
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Searches the web for a query using DuckDuckGo.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetches the text content of a given URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to fetch.' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_viewer',
      description: 'Automates a web browser to navigate, click, and interact with websites.',
      parameters: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['navigate', 'click', 'type', 'scroll', 'wait', 'snapshot'],
            description: 'The action to perform.' 
          },
          url: { type: 'string', description: 'The URL to navigate to (used with navigate action).' },
          selector: { type: 'string', description: 'The CSS selector for click or type actions.' },
          value: { type: 'string', description: 'The text to type (used with type action).' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_image',
      description: 'Reads and describes an image file. Converts image to base64 for AI vision processing.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The image file path to read.' },
        },
        required: ['path'],
      },
    },
  },
];

export class ToolExecutor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: Config | null = null;
  private cwd: string = process.cwd();

  constructor(options: ToolExecutorOptions = {}) {
    this.config = options.config || null;
    this.cwd = options.workingDirectory || process.cwd();
  }

  async execute(name: string, args: any): Promise<string> {
    const start = Date.now();
    let toolResult;
    try {
      switch (name) {
        case 'list_directory': {
          // Robust directory listing: recursion, maxDepth, symlink/loop protection, validation, timeout
          const targetPath = path.resolve(this.cwd, args.path || '.');
          const maxDepth = Number.isInteger(args.maxDepth) && args.maxDepth > 0 ? args.maxDepth : 1;
          const timeoutMs = Number.isInteger(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : 15000;
          const visited = new Set<string>();
          const result: any[] = [];
          let timedOut = false;

          function isPathSafe(p: string) {
            // Prevent traversing system roots or parent escapes
            const norm = path.normalize(p);
            if (norm.includes('..')) return false;
            return true;
          }

          async function walk(dir: string, depth: number) {
            if (timedOut) return;
            if (depth > maxDepth) return;
            if (!isPathSafe(dir)) {
              result.push({ path: dir, error: 'Unsafe path' });
              return;
            }
            let real;
            try {
              real = await fs.realpath(dir);
            } catch {
              real = dir;
            }
            if (visited.has(real)) return;
            visited.add(real);
            let entries: string[] = [];
            try {
              entries = await fs.readdir(dir);
            } catch (e) {
              result.push({ path: dir, error: 'Cannot read directory' });
              return;
            }
            for (const entry of entries) {
              if (timedOut) return;
              const full = path.join(dir, entry);
              let stat;
              try {
                stat = await fs.lstat(full);
              } catch {
                result.push({ path: full, error: 'Cannot stat' });
                continue;
              }
              if (stat.isSymbolicLink()) {
                result.push({ path: full, type: 'symlink' });
                continue;
              }
              if (stat.isDirectory()) {
                result.push({ path: full, type: 'directory' });
                await walk(full, depth + 1);
              } else {
                result.push({ path: full, type: 'file' });
              }
            }
          }

          // Timeout protection
          await Promise.race([
            walk(targetPath, 1),
            new Promise<void>((_, rej) => setTimeout(() => { timedOut = true; rej(new Error('Timeout listing directory')); }, timeoutMs))
          ]).catch(e => result.push({ path: targetPath, error: e.message }));

          toolResult = JSON.stringify(result, null, 2);
          return toolResult;
        }
        case 'read_file': {
          let readPath = path.resolve(this.cwd, args.path);
          if (!await fs.pathExists(readPath)) {
            const ext = path.extname(readPath);
            const base = readPath.substring(0, readPath.length - ext.length);
            const alternatives: Record<string, string[]> = {
              '.js': ['.ts', '.jsx', '.tsx', '.cjs', '.mjs'],
              '.ts': ['.js', '.tsx', '.jsx'],
              '.jsx': ['.tsx', '.js', '.ts'],
              '.tsx': ['.jsx', '.ts', '.js'],
              '.css': ['.scss', '.sass', '.less'],
              '.json': ['.yaml', '.yml', '.jsonc'],
              '.yaml': ['.yml', '.json'],
              '.yml': ['.yaml', '.json'],
              '.md': ['.markdown', '.txt'],
              '': ['.ts', '.js', '.json', '.md', '.tsx', '.jsx']
            };
            const tries = alternatives[ext] || [];
            for (const altExt of tries) {
              const altPath = base + altExt;
              if (await fs.pathExists(altPath)) {
                readPath = altPath;
                break;
              }
            }
          }
          const content = await fs.readFile(readPath, 'utf-8');
          toolResult = content;
          return toolResult;
        }
        case 'write_file': {
          const writePath = path.resolve(this.cwd, args.path);
          await fs.ensureDir(path.dirname(writePath));
          await fs.writeFile(writePath, args.content);
          toolResult = `Successfully written to ${args.path}`;
          return toolResult;
        }
        case 'run_command': {
          toolResult = await this.performRunCommand(args.command);
          return toolResult;
        }
        case 'web_search':
          return await this.performWebSearch(args.query);
        case 'web_fetch':
          return await this.performWebFetch(args.url);
        case 'web_viewer':
          return await this.performWebViewer(args);
        case 'read_image':
          return await this.performReadImage(args.path);
        default:
          return `Unknown tool: ${name}`;
      }
    } catch (error: any) {
      return `Error executing tool ${name}: ${error.message}`;
    }
  }

  private async performRunCommand(fullCommand: string): Promise<string> {
    const windows = isWindows();
    const android = isAndroid();
    // Termux ships bash at $PREFIX/bin/bash; falling back to the system shell
    // keeps pipes, globbing, and && working when bash is not installed.
    const termuxBash = android ? `${getBinDir()}/bash` : null;
    const shell =
      windows
        ? 'powershell.exe'
        : termuxBash && fs.existsSync(termuxBash)
          ? termuxBash
          : undefined;
    
    // Split commands by && to handle them sequentially and persist state (like CD)
    const commands = fullCommand.split('&&').map(c => c.trim());
    let combinedOutput = '';
    
    for (const cmd of commands) {
      // Handle 'cd' commands to update persistent cwd
      if (cmd.startsWith('cd ')) {
        const targetDir = cmd.substring(3).trim().replace(/^["']|["']$/g, '');
        const newPath = path.resolve(this.cwd, targetDir);
        
        if (await fs.pathExists(newPath)) {
          this.cwd = newPath;
          combinedOutput += `Changed directory to: ${this.cwd}\n`;
        } else {
          return combinedOutput + `Error: Directory not found: ${targetDir}`;
        }
        continue;
      }

      try {
        let cmdToRun = cmd;
        // Fix common Linux-isms for Windows PowerShell
        if (windows) {
          // PowerShell's mkdir creates parents by default, doesn't need -p
          cmdToRun = cmdToRun.replace(/mkdir -p /g, 'mkdir ');
          // Map rm -rf to PowerShell equivalent
          cmdToRun = cmdToRun.replace(/rm -rf /g, 'Remove-Item -Recurse -Force ');
          // Map touch to PowerShell equivalent
          cmdToRun = cmdToRun.replace(/touch /g, 'New-Item -ItemType File -Force ');
          // Cross-platform 'ls' often works in PS, but 'dir' is more native
          if (cmdToRun === 'ls') cmdToRun = 'dir';
        }

        const { stdout, stderr } = await execAsync(cmdToRun, { 
          cwd: this.cwd,
          shell: shell 
        });
        
        if (stdout) combinedOutput += stdout + '\n';
        if (stderr) combinedOutput += stderr + '\n';
      } catch (error: any) {
        return combinedOutput + `Error executing "${cmd}": ${error.message}`;
      }
    }
    
    return combinedOutput.trim() || 'Command executed successfully with no output.';
  }

  /**
   * Load the browser engine, translating an absent dependency into a message
   * that names the right command for the current platform.
   */
  private async loadBrowserEngine(): Promise<PuppeteerModule> {
    try {
      return await loadPuppeteer();
    } catch {
      if (isAndroid()) {
        throw new Error(
          'Browser engine unavailable. Enable web tools with:\n' +
            '  PUPPETEER_SKIP_DOWNLOAD=1 npm install puppeteer\n' +
            '  pkg install chromium',
        );
      }
      throw new Error('Browser engine unavailable. Install it with: npm install puppeteer');
    }
  }

  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      const launchOptions: any = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };

      // On Android/Termux there is no bundled Chromium, so point puppeteer at
      // the system package (pkg install chromium).
      const chromiumPath = findChromiumBinary();
      if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
      } else if (isAndroid()) {
        throw new Error(
          'Chromium not found. Install it with: pkg install chromium\n' +
            'Web features (search, fetch, viewer) require Chromium on Termux.',
        );
      }

      const puppeteer = await this.loadBrowserEngine();
      this.browser = await puppeteer.launch(launchOptions);
    }
    if (!this.page) {
      const pages = await this.browser.pages();
      const newPage = pages.length > 0 ? pages[0] : await this.browser.newPage();
      this.page = newPage || null;
      if (this.page) {
        await this.page.setViewport({ width: 1280, height: 800 });
      }
    }
  }

  private async performWebSearch(query: string): Promise<string> {
    let searchPage: Page | null = null;
    try {
      await this.ensureBrowser();
      
      if (!this.browser) {
        return 'Browser instance not initialized.';
      }

      searchPage = await this.browser.newPage(); // Removed '!'

      await searchPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      const searchUrl = `https://duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
      await searchPage.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const results = await searchPage.evaluate(() => {
        const items: any[] = [];
        // @ts-ignore
        const rows = Array.from(document.querySelectorAll('table:last-of-type tr'));
        
        for (let i = 0; i < rows.length; i += 4) {
          const titleRow = rows[i] as any;
          const snippetRow = rows[i + 1] as any;
          
          if (titleRow && snippetRow) {
            const linkEl = titleRow.querySelector('a.result-link');
            const snippetEl = snippetRow.querySelector('.result-snippet');
            
            if (linkEl && snippetEl) {
              items.push({
                title: (linkEl as any).innerText.trim(),
                url: (linkEl as any).href,
                snippet: (snippetEl as any).innerText.trim()
              });
            }
          }
          if (items.length >= 5) break;
        }
        return items;
      });

      if (results.length === 0) return 'No results found on the search page.';

      return JSON.stringify({ count: results.length, results }, null, 2);
    } catch (error: any) {
      console.error(`Web Search Error: ${error.message}`);
      return `Web Search Error: ${error.message}`;
    } finally {
      if (searchPage) {
        await searchPage.close();
      }
    }
  }

  private async performWebFetch(url: string): Promise<string> {
    // Clean DuckDuckGo redirect URLs if present
    if (url.includes('duckduckgo.com/l/?uddg=')) {
      try {
        const urlObj = new URL(url);
        const target = urlObj.searchParams.get('uddg');
        if (target) url = target;
      } catch (e) {
        // Fallback to original URL
      }
    }

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': userAgent },
        timeout: 15000,
      });
      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, iframe, ads').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      
      if (text.length < 100) {
        throw new Error('Content too short, possibly blocked or needs JS');
      }
      
      return text.substring(0, 15000);
    } catch (error: any) {
      console.log(`Axios fetch failed for ${url}, trying with Puppeteer fallback...`);
      
      // Fallback to Puppeteer for more robust fetching
      try {
        await this.ensureBrowser();
        if (!this.browser) throw new Error('Browser not available');
        
        const tempPage = await this.browser.newPage();
        await tempPage.setUserAgent(userAgent);
        
        try {
          await tempPage.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          const content = await tempPage.evaluate(() => {
            // @ts-ignore
            const junk = document.querySelectorAll('script, style, nav, footer, iframe, .ads, #ads');
            junk.forEach((el: any) => el.remove());
            // @ts-ignore
            return document.body.innerText;
          });
          
          await tempPage.close();
          return content.replace(/\s+/g, ' ').trim().substring(0, 15000);
        } catch (pageError: any) {
          await tempPage.close();
          throw pageError;
        }
      } catch (fallbackError: any) {
        console.error(`Web Fetch Error (including fallback): ${fallbackError.message}`);
        return `Web Fetch Error: ${fallbackError.message}. Accessing ${url} was blocked or the page is unavailable.`;
      }
    }
  }

  private async performWebViewer(args: any): Promise<string> {
    const { action, url, selector, value } = args;
    try {
      await this.ensureBrowser();

      if (!this.page) {
        return 'Browser page not initialized.';
      }

      const page = this.page;
      let result = '';
      switch (action) {
        case 'navigate':
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
          result = `Navigated to ${url}. `;
          break;
        case 'click':
          await page.waitForSelector(selector, { timeout: 10000 });
          await page.click(selector);
          result = `Clicked ${selector}. `;
          break;
        case 'type':
          await page.waitForSelector(selector, { timeout: 10000 });
          await page.type(selector, value);
          result = `Typed into ${selector}. `;
          break;
        case 'scroll':
          await page.evaluate(() => {
            // @ts-ignore
            window.scrollBy(0, 500);
          });
          result = 'Scrolled down. ';
          break;
        case 'wait':
          await new Promise(r => setTimeout(r, 3000));
          result = 'Waited. ';
          break;
        case 'snapshot':
          const snapshot = await page.screenshot({ encoding: 'base64' });
          result = `Screenshot taken: data:image/png;base64,${snapshot}`;
          break;
        }

        const title = await page.title();
        const currentUrl = page.url();
        const elements = await page.evaluate(() => {
        // @ts-ignore
        const items = Array.from(document.querySelectorAll('a, button, input'));
        return items.slice(0, 15).map(el => {
          const element = el as any; // Cast to any for browser context compatibility
          return {
            tag: element.tagName,
            text: element.innerText || element.placeholder || '',
            selector: element.id ? `#${element.id}` : element.className ? `.${element.className.split(' ')[0]}` : ''
          };
        });
        });
        
      return `${result}
Page: ${title}
URL: ${currentUrl}
Elements: ${JSON.stringify(elements, null, 2)}`;
    } catch (error: any) {
      console.error(`Web Viewer Error: ${error.message}`);
      return `Web Viewer Error: ${error.message}`;
    }
  }

  private async performPageScraping(url: string, selector: string): Promise<string> {
    try {
      await this.ensureBrowser();
      if (!this.page) {
        return 'Browser page not initialized.';
      }
      const page = this.page;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      const title = await page.title();
      const currentUrl = page.url();
      const elements = await page.evaluate((sel: string) => {
        // @ts-ignore
        const items = Array.from(document.querySelectorAll(sel));
        return items.slice(0, 15).map(el => {
          const element = el as any; // Cast to any for browser context compatibility
          return {
            tag: element.tagName,
            text: element.innerText || element.placeholder || '',
            selector: element.id ? `#${element.id}` : element.className ? `.${element.className.split(' ')[0]}` : ''
          };
        });
      }, selector); // Pass selector to evaluate

      return `Page: ${title}
URL: ${currentUrl}
Elements: ${JSON.stringify(elements, null, 2)}`;
    } catch (error: any) {
      console.error(`Page Scraping Error: ${error.message}`);
      return `Page Scraping Error: ${error.message}`;
    }
  }

  private async performReadImage(imagePath: string): Promise<string> {
    try {
      const fullPath = path.resolve(imagePath);
      
      if (!(await fs.pathExists(fullPath))) {
        return `Error: Image file not found at ${imagePath}`;
      }

      const stats = await fs.stat(fullPath);
      const mimeType = this.getImageMimeType(fullPath);
      
      if (!mimeType) {
        return `Error: Unsupported image format. Supported formats: PNG, JPEG, GIF, WebP, BMP`;
      }

      // Check file size (max 5MB for base64 conversion)
      if (stats.size > 5 * 1024 * 1024) {
        return `Error: Image too large. Maximum size is 5MB. Current: ${(stats.size / 1024 / 1024).toFixed(2)}MB`;
      }

      // Read image and convert to base64
      const imageBuffer = await fs.readFile(fullPath);
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // If config is available, use vision model to analyze the image
      if (this.config?.apiKey && this.config?.visionModel) {
        try {
          const response = await axios.post(
            'https://integrate.api.nvidia.com/v1/chat/completions',
            {
              model: this.config.visionModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: 'Describe this image in detail. What do you see?' },
                    { type: 'image_url', image_url: { url: dataUrl } }
                  ]
                }
              ],
              max_tokens: 4096,
              temperature: 0.7,
              top_p: 0.95,
              stream: false
            },
            {
              headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 60000
            }
          );

          const description = response.data?.choices?.[0]?.message?.content || 'No description available';
          const reasoning = response.data?.choices?.[0]?.message?.reasoning_content;

          let result = `Image Analysis:
File: ${path.basename(fullPath)}
Dimensions: ${JSON.stringify(await this.getImageDimensions(fullPath))}

Description:
${description}`;
          
          if (reasoning) {
            result += `

Reasoning:
${reasoning}`;
          }

          return result;
        } catch (apiError: any) {
          console.error(`Vision API error: ${apiError.message}`);
          // Fall back to returning base64 if API call fails
          return JSON.stringify({
            path: fullPath,
            size: stats.size,
            mimeType: mimeType,
            base64: dataUrl,
            dimensions: await this.getImageDimensions(fullPath),
            apiError: `Vision API error: ${apiError.message}`
          }, null, 2);
        }
      }

      // Return base64 data if no config available
      return JSON.stringify({
        path: fullPath,
        size: stats.size,
        mimeType: mimeType,
        base64: dataUrl,
        dimensions: await this.getImageDimensions(fullPath),
      }, null, 2);
    } catch (error: any) {
      console.error(`Read Image Error: ${error.message}`);
      return `Error reading image: ${error.message}`;
    }
  }

  private getImageMimeType(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    };
    return mimeTypes[ext] || null;
  }

  private async getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
    // Prefer parsing the file header directly: Termux (and most mobile
    // environments) do not ship the `file` utility, and this avoids a shell-out.
    const fromHeader = await this.readImageHeaderDimensions(filePath);
    if (fromHeader) {
      return fromHeader;
    }

    try {
      const { stdout } = await execAsync(`file "${filePath}"`);
      const match = stdout.match(/(\d+) x (\d+)/);
      if (match && match[1] && match[2]) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
      }
      return null;
    } catch (error: any) {
      console.error(`Get Image Dimensions Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Read width/height straight from PNG, GIF, BMP, and WebP headers.
   * Returns null for formats that need heavier decoding (e.g. JPEG).
   */
  private async readImageHeaderDimensions(
    filePath: string,
  ): Promise<{ width: number; height: number } | null> {
    let handle: FileHandle | null = null;
    try {
      handle = await fsp.open(filePath, 'r');
      const header = Buffer.alloc(32);
      const { bytesRead } = await handle.read(header, 0, 32, 0);
      if (bytesRead < 16) {
        return null;
      }

      // PNG: 8-byte signature then IHDR width/height as big-endian uint32.
      if (header.subarray(0, 8).equals(PNG_SIGNATURE)) {
        return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
      }

      // BMP: "BM" then a little-endian uint32 width/height at offsets 18/22.
      if (header.subarray(0, 2).toString('ascii') === 'BM') {
        return { width: header.readUInt32LE(18), height: header.readUInt32LE(22) };
      }

      // GIF: "GIF87a" or "GIF89a" then little-endian uint16 width/height.
      if (header.subarray(0, 3).toString('ascii') === 'GIF') {
        return { width: header.readUInt16LE(6), height: header.readUInt16LE(8) };
      }

      // WebP: RIFF....WEBP followed by a VP8/VP8L/VP8X chunk.
      if (
        header.subarray(0, 4).toString('ascii') === 'RIFF' &&
        header.subarray(8, 12).toString('ascii') === 'WEBP'
      ) {
        const chunk = header.subarray(12, 16).toString('ascii');
        if (chunk === 'VP8X') {
          const b = (offset: number): number => header[offset] ?? 0;
          return {
            width: 1 + (b(24) | (b(25) << 8) | (b(26) << 16)),
            height: 1 + (b(27) | (b(28) << 8) | (b(29) << 16)),
          };
        }
        if (chunk === 'VP8L') {
          const bits = header.readUInt32LE(21);
          return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
        }
        if (chunk === 'VP8 ') {
          return { width: header.readUInt16LE(26) & 0x3fff, height: header.readUInt16LE(28) & 0x3fff };
        }
      }

      return null;
    } catch {
      return null;
    } finally {
      await handle?.close();
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
