import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import type { Config } from '../types/index.js';
import { SYSTEM_PROMPT } from '../prompts/system-prompt.js';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Configuration directory path in user's home directory */
const CONFIG_DIR = path.join(os.homedir(), '.luxyie');

/** Main configuration file path */
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * NVIDIA Builds Public API Key
 * This is the access public api key nvidia builds - freely available for public use
 * Users can override with NVIDIA_API_KEY environment variable if needed
 */
const NVIDIA_BUILDS_PUBLIC_API_KEY = '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';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/** Default configuration values */
const DEFAULT_CONFIG: Config = {
  version: '1.7.0',
  
  // API Configuration - Using NVIDIA Builds public access key
  apiKey: NVIDIA_BUILDS_PUBLIC_API_KEY,
  apiUrl: 'https://integrate.api.nvidia.com/v1',
  
  // Model Configuration
  model: 'qwen/qwen3-next-80b-a3b-instruct',
  visionModel: 'moonshotai/kimi-k2.5',
  
  // Generation Parameters
  maxTokens: 16384,
  temperature: 0.6,
  topP: 0.95,
  enableThinking: true,
  
  // System Prompt (imported from separate file for better organization)
  systemPrompt: SYSTEM_PROMPT,
  
  // Feature Flags
  historyEnabled: true,
  streamEnabled: true,
};

// ============================================================================
// CONFIG MANAGER CLASS
// ============================================================================

/**
 * Manages application configuration with persistence
 * Handles reading, writing, validation, and environment overrides
 */
export class ConfigManager {
  private config: Config;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Initialize configuration manager
   * Creates config directory and loads existing config if present
   */
  async init(): Promise<void> {
    await fs.ensureDir(CONFIG_DIR);

    if (await fs.pathExists(CONFIG_FILE)) {
      try {
        const savedConfig = await fs.readJson(CONFIG_FILE);
        this.config = { ...this.config, ...savedConfig };
      } catch {
        // If file is corrupted, use defaults
      }
    }

    // Allow user override via environment variable
    if (process.env.NVIDIA_API_KEY) {
      this.config.apiKey = process.env.NVIDIA_API_KEY;
    }

    // Set environment variables for other services
    process.env.NVIDIA_API_KEY = this.config.apiKey;
    process.env.NVIDIA_API_URL = this.config.apiUrl;
  }

  /**
   * Persist current configuration to disk
   */
  async save(): Promise<void> {
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_FILE, this.config, { spaces: 2 });
  }

  /**
   * Get a copy of current configuration
   */
  get(): Config {
    return { ...this.config };
  }

  /**
   * Update configuration with partial changes
   */
  async update(updates: Partial<Config>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.save();
  }

  /**
   * Update API key and persist
   */
  async setApiKey(apiKey: string): Promise<void> {
    this.config.apiKey = apiKey;
    await this.save();
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await this.save();
  }

  /**
   * Validate configuration
   * Public API key is always considered valid
   */
  validate(): boolean {
    return true;
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return CONFIG_FILE;
  }

  /**
   * Get history directory path
   */
  getHistoryDir(): string {
    return path.join(CONFIG_DIR, 'history');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Global configuration manager instance */
export const configManager = new ConfigManager();
