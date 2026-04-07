/**
 * Token Limit Handler
 * Detects when a model reaches its token limit and guides the user
 */

import inquirer from 'inquirer';
import { colors } from '../ui/components.js';
import { formatSystemMessage, formatErrorMessage } from '../utils/index.js';

export interface TokenLimitInfo {
  modelId: string;
  maxTokens: number;
  currentTokens: number;
  usagePercentage: number;
}

/**
 * Check if token usage is approaching the limit
 */
export function isTokenLimitApproaching(
  currentTokens: number,
  maxTokens: number,
  threshold: number = 0.8
): boolean {
  return currentTokens >= maxTokens * threshold;
}

/**
 * Check if token limit has been exceeded
 */
export function isTokenLimitExceeded(
  currentTokens: number,
  maxTokens: number
): boolean {
  return currentTokens >= maxTokens;
}

/**
 * Get token limit information
 */
export function getTokenLimitInfo(
  modelId: string,
  maxTokens: number,
  currentTokens: number
): TokenLimitInfo {
  return {
    modelId,
    maxTokens,
    currentTokens,
    usagePercentage: Math.round((currentTokens / maxTokens) * 100),
  };
}

/**
 * Show warning when approaching token limit
 */
export function showTokenLimitWarning(info: TokenLimitInfo): string {
  const lines = [
    `⚠️  Token usage warning`,
    `Model: ${info.modelId}`,
    `Usage: ${info.currentTokens.toLocaleString()} / ${info.maxTokens.toLocaleString()} (${info.usagePercentage}%)`,
    ``,
    `The model is approaching its token limit. You may want to:`,
    `- Start a new session with /clear`,
    `- Switch to a model with higher limits using /model select`,
  ];

  return lines.join('\n');
}

/**
 * Show error when token limit is exceeded
 */
export function showTokenLimitError(info: TokenLimitInfo): string {
  const lines = [
    `🚫 Token limit exceeded`,
    `Model: ${info.modelId}`,
    `Usage: ${info.currentTokens.toLocaleString()} / ${info.maxTokens.toLocaleString()} (100%)`,
    ``,
    `The model has reached its token limit. To continue:`,
    `1. Save your session history with /share`,
    `2. Restart the CLI to start a fresh session`,
    `3. Or switch to a model with higher token limits`,
  ];

  return lines.join('\n');
}

/**
 * Handle token limit reached scenario
 * Offers user options: save session, switch model, or exit
 */
export async function handleTokenLimitReached(
  info: TokenLimitInfo,
  historyManager: any,
  sessionId: string
): Promise<'continue' | 'switch-model' | 'exit'> {
  console.log('');
  console.log(formatErrorMessage(`Token limit reached for model: ${info.modelId}`));
  console.log(formatSystemMessage(`Usage: ${info.currentTokens.toLocaleString()} / ${info.maxTokens.toLocaleString()} tokens`));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '💾 Save session and continue (start new session)', value: 'continue' },
        { name: '🔄 Switch to another model', value: 'switch-model' },
        { name: '🚪 Exit the CLI', value: 'exit' },
      ],
    },
  ]);

  if (action === 'continue') {
    // Session is already saved by historyManager
    console.log(formatSystemMessage('✓ Session history saved. You can restart the CLI for a fresh session.'));
    return 'continue';
  }

  if (action === 'switch-model') {
    return 'switch-model';
  }

  return 'exit';
}

/**
 * Format token usage display
 */
export function formatTokenUsage(current: number, max: number): string {
  const percentage = Math.round((current / max) * 100);
  const bar = createProgressBar(percentage, 20);

  return `${bar} ${current.toLocaleString()} / ${max.toLocaleString()} tokens (${percentage}%)`;
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percentage: number, width: number): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const color = percentage < 50 ? colors.green : percentage < 80 ? colors.yellow : colors.red;
  const filledChar = '█';
  const emptyChar = '░';

  return color(filledChar.repeat(filled) + emptyChar.repeat(empty));
}
