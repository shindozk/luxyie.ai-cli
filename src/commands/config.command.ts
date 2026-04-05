import inquirer from 'inquirer';
import type { ConfigManager } from '../services/config.service.js';
import { colors, success, info, formatBox } from '../ui/theme.js';
import type { Config } from '../types/index.js';

export class ConfigCommand {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async execute(subcommand?: string): Promise<void> {
    switch (subcommand) {
      case 'show':
        await this.showConfig();
        break;
      case 'set':
        await this.setConfig();
        break;
      case 'reset':
        await this.resetConfig();
        break;
      default:
        await this.interactiveConfig();
    }
  }

  private async showConfig(): Promise<void> {
    const config = this.configManager.get();
    
    console.log(formatBox('Current Configuration', `
Model: ${config.model}
Max Tokens: ${config.maxTokens}
Temperature: ${config.temperature}
Top P: ${config.topP}
Enable Thinking: ${config.enableThinking ? 'Yes' : 'No'}
History Enabled: ${config.historyEnabled ? 'Yes' : 'No'}
Stream Enabled: ${config.streamEnabled ? 'Yes' : 'No'}
    `.trim()));
  }

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
        validate: (v: number) => v > 0 && v <= 8192,
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperature (0-1):',
        default: config.temperature,
        validate: (v: number) => v >= 0 && v <= 1,
      },
      {
        type: 'confirm',
        name: 'enableThinking',
        message: 'Enable Thinking?',
        default: config.enableThinking,
      },
      {
        type: 'confirm',
        name: 'historyEnabled',
        message: 'Enable History?',
        default: config.historyEnabled,
      },
    ]);

    await this.configManager.update(answers);
    console.log(success('Configuration updated successfully!'));
  }

  private async resetConfig(): Promise<void> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset all settings?',
        default: false,
      },
    ]);

    if (confirm) {
      await this.configManager.reset();
      console.log(success('Settings reset to default values!'));
    }
  }

  private async interactiveConfig(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: '📋 View current configuration', value: 'show' },
          { name: '⚙️  Change settings', value: 'set' },
          { name: '🔄 Reset settings', value: 'reset' },
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
