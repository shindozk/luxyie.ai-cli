/**
 * Model Command Handler
 * Handles model listing and selection
 */

import inquirer from 'inquirer';
import { AVAILABLE_MODELS } from '../services/models.js';
import { colors } from '../ui/components.js';
import { formatErrorMessage, formatSystemMessage, formatSeparator } from '../utils/index.js';

export interface ModelCommandOptions {
  config: any;
  apiClient: any;
  ui: any;
}

/**
 * List all available models (visual list)
 */
export async function listAllModels(options: ModelCommandOptions): Promise<void> {
  options.ui.log(`\n${colors.bold('🤖 Available Models')}\n`);
  options.ui.log(`${formatSeparator(70)}\n`);

  for (const model of AVAILABLE_MODELS) {
    const isCurrent = model.id === options.config.model;
    const marker = isCurrent ? colors.green('●') : colors.dim('○');
    const reasoning = model.supportsReasoning ? colors.info(' [thinking]') : '';
    const provider = colors.dim(`[${model.provider}]`);

    const name = isCurrent ? colors.bold(model.id) : model.id;
    options.ui.log(`  ${marker} ${name} ${reasoning} ${provider}\n`);
    options.ui.log(`    ${colors.dim(`temp: ${model.temperature} | max_tokens: ${model.max_tokens} | top_p: ${model.top_p}`)}\n`);
  }

  options.ui.log(`${formatSeparator(70)}\n`);
  options.ui.log(formatSystemMessage('Use /model select to switch models interactively'));
}

/**
 * Show interactive model selection menu
 */
export async function showModelSelectionMenu(options: ModelCommandOptions): Promise<void> {
  options.ui.log(`\n${colors.bold('🔄 Select a Model')}\n`);

  const choices: { name: string; value: string | null }[] = AVAILABLE_MODELS.map((model) => {
    const isCurrent = model.id === options.config.model;
    const reasoning = model.supportsReasoning ? colors.info(' [thinking]') : '';
    const marker = isCurrent ? colors.green('●') : colors.dim('○');

    return {
      name: `${marker} ${isCurrent ? colors.bold(model.id) : model.id}${reasoning} ${colors.dim(`(temp: ${model.temperature})`)}`,
      value: model.id,
    };
  });

  choices.push(new (inquirer as any).Separator('─'.repeat(50)));
  choices.push({ name: '❌ Cancel', value: null });

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Choose a model:',
      choices,
      pageSize: 15,
    },
  ]);

  if (selected) {
    await switchModel(selected, options);
  } else {
    options.ui.log(formatSystemMessage('Model selection cancelled'));
  }
}

/**
 * Switch to a specific model
 */
export async function switchModel(modelId: string, options: ModelCommandOptions): Promise<void> {
  const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);

  if (!modelConfig) {
    options.ui.log(formatErrorMessage(`Model not found: ${modelId}`));
    return;
  }

  options.config.model = modelId;
  options.apiClient.setModel(modelId);

  options.ui.log(formatSystemMessage(`✓ Model switched to: ${colors.secondary(modelId)}`));
  options.ui.log(formatSystemMessage(`Temperature: ${modelConfig.temperature} | Max tokens: ${modelConfig.max_tokens}`));
}

/**
 * Get current model max tokens
 */
export function getCurrentModelMaxTokens(modelId: string): number {
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
  return model?.max_tokens || 8192;
}
