/**
 * Modern Config Command - Gemini CLI Style
 * Clean, organized configuration management
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import type { ConfigManager } from '../services/config.service.js';
import { colors, formatBox } from '../ui/components.js';
import type { Config } from '../types/index.js';

export class ConfigCommand {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async execute(subcommand?: string): Promise<void> {
    switch (subcommand) {
      case 'show':
      case 'list':
        await this.showConfig();
        break;
      case 'set':
      case 'edit':
        await this.setConfig();
        break;
      case 'reset':
        await this.resetConfig();
        break;
      case 'model':
        await this.showModelInfo();
        break;
      default:
        await this.interactiveMenu();
    }
  }

  // ============================================================================
  // SHOW CONFIG
  // ============================================================================

  private async showConfig(): Promise<void> {
    const config = this.configManager.get();

    console.log(`\n${colors.bold('⚙️  Current Configuration')}\n`);
    console.log(`${colors.dim('─'.repeat(50))}`);
    console.log(`\n  ${colors.dim('Model:')} ${colors.secondary(config.model)}`);
    console.log(`  ${colors.dim('Max Tokens:')} ${colors.white(config.maxTokens)}`);
    console.log(`  ${colors.dim('Temperature:')} ${colors.white(config.temperature)}`);
    console.log(`  ${colors.dim('Top P:')} ${colors.white(config.topP)}`);
    console.log(`  ${colors.dim('Thinking:')} ${config.enableThinking ? colors.green('Enabled') : colors.dim('Disabled')}`);
    console.log(`  ${colors.dim('History:')} ${config.historyEnabled ? colors.green('Enabled') : colors.dim('Disabled')}`);
    console.log(`  ${colors.dim('Streaming:')} ${config.streamEnabled ? colors.green('Enabled') : colors.dim('Disabled')}`);
    console.log(`  ${colors.dim('API URL:')} ${colors.dim(config.apiUrl)}`);
    console.log(`\n${colors.dim('─'.repeat(50))}\n`);
  }

  // ============================================================================
  // SET CONFIG
  // ============================================================================

  private async setConfig(): Promise<void> {
    const config = this.configManager.get();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: 'Model:',
        default: config.model,
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Max Tokens:',
        default: config.maxTokens,
        validate: (v: number) => v > 0 && v <= 32768 ? true : 'Must be between 1 and 32768',
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperature (0-2):',
        default: config.temperature,
        validate: (v: number) => v >= 0 && v <= 2 ? true : 'Must be between 0 and 2',
      },
      {
        type: 'number',
        name: 'topP',
        message: 'Top P (0-1):',
        default: config.topP,
        validate: (v: number) => v >= 0 && v <= 1 ? true : 'Must be between 0 and 1',
      },
      {
        type: 'confirm',
        name: 'enableThinking',
        message: 'Enable Thinking Mode?',
        default: config.enableThinking,
      },
      {
        type: 'confirm',
        name: 'historyEnabled',
        message: 'Enable History?',
        default: config.historyEnabled,
      },
      {
        type: 'confirm',
        name: 'streamEnabled',
        message: 'Enable Streaming?',
        default: config.streamEnabled,
      },
    ]);

    await this.configManager.update(answers);
    console.log(`\n${colors.success('✓')} ${colors.green('Configuration updated successfully!')}\n`);
  }

  // ============================================================================
  // RESET CONFIG
  // ============================================================================

  private async resetConfig(): Promise<void> {
    console.log(`\n${colors.warning('⚠')} ${colors.yellow('This will reset all settings to defaults.')}\n`);
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure?',
        default: false,
      },
    ]);

    if (confirm) {
      await this.configManager.reset();
      console.log(`\n${colors.success('✓')} ${colors.green('Settings reset to defaults!')}\n`);
    } else {
      console.log(`\n${colors.dim('Operation cancelled.')}\n`);
    }
  }

  // ============================================================================
  // MODEL INFO
  // ============================================================================

  private async showModelInfo(): Promise<void> {
    const { AVAILABLE_MODELS } = await import('../services/models.js');
    const config = this.configManager.get();

    console.log(`\n${colors.bold('🤖 Model Information')}\n`);
    console.log(`${colors.dim('─'.repeat(60))}`);

    for (const model of AVAILABLE_MODELS) {
      const isCurrent = model.id === config.model;
      const marker = isCurrent ? colors.green('●') : colors.dim('○');
      const reasoning = model.supportsReasoning ? colors.info(' [thinking]') : '';
      
      console.log(`\n  ${marker} ${isCurrent ? colors.bold(model.id) : model.id}${reasoning}`);
      console.log(`    ${colors.dim(`Provider: ${model.provider}`)}`);
      console.log(`    ${colors.dim(`Temperature: ${model.temperature}`)}`);
      console.log(`    ${colors.dim(`Max Tokens: ${model.max_tokens}`)}`);
    }

    console.log(`\n${colors.dim('─'.repeat(60))}\n`);
    console.log(`${colors.dim('Use /model <id> in chat to switch models')}\n`);
  }

  // ============================================================================
  // INTERACTIVE MENU
  // ============================================================================

  private async interactiveMenu(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Configuration',
        choices: [
          { name: '📋 Show current configuration', value: 'show' },
          { name: '⚙️  Edit settings', value: 'set' },
          { name: '🤖 Model information', value: 'model' },
          { name: '🔄 Reset to defaults', value: 'reset' },
          new inquirer.Separator(),
          { name: '❌ Exit', value: 'exit' },
        ],
      },
    ]);

    if (action !== 'exit') {
      await this.execute(action);
    }
  }
}
