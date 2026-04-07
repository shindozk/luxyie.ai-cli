/**
 * Tool Executor Helper Module
 * Manages tool execution flow, approval, and result handling
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { formatSecurityPrompt, formatToolStatus } from '../ui/components.js';

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  result: string;
  success: boolean;
}

export interface ToolApprovalOptions {
  allowedTools?: Set<string>;
  onApprove?: (name: string) => void;
  onDeny?: (name: string) => void;
}

export type ApprovalAction = 'once' | 'always' | 'deny';

/**
 * Parse tool call arguments safely
 */
export function parseToolArgs(argsString: string): any {
  try {
    return JSON.parse(argsString);
  } catch {
    return {};
  }
}

/**
 * Check if a tool is approved for execution
 */
export async function getToolApproval(
  toolCall: ToolCall,
  options: ToolApprovalOptions = {}
): Promise<ApprovalAction> {
  const { allowedTools = new Set(), onApprove, onDeny } = options;
  const name = toolCall.function.name;
  const args = parseToolArgs(toolCall.function.arguments);

  // If already allowed, skip prompt
  if (allowedTools.has(name)) {
    onApprove?.(name);
    return 'always';
  }

  // Show security prompt
  process.stdout.write(formatSecurityPrompt(name, args));

  // Get user decision
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.yellow(`Allow ${name}?`),
      choices: [
        { name: '✓ Allow once', value: 'once' },
        { name: '✓✓ Always allow (this session)', value: 'always' },
        { name: '✗ Deny', value: 'deny' },
      ],
    },
  ]);

  if (action === 'deny') {
    onDeny?.(name);
  } else {
    onApprove?.(name);
  }

  return action;
}

/**
 * Execute a single tool call
 */
export async function executeToolCall(
  toolCall: ToolCall,
  executor: any,
  options: ToolApprovalOptions = {}
): Promise<ToolExecutionResult> {
  const name = toolCall.function.name;
  const args = parseToolArgs(toolCall.function.arguments);

  // Get approval
  const approval = await getToolApproval(toolCall, options);

  if (approval === 'deny') {
    process.stdout.write(formatToolStatus(name, 'denied') + '\n');
    return {
      toolCallId: toolCall.id,
      name,
      result: 'User denied tool execution.',
      success: false,
    };
  }

  // Add to allowed set if "always"
  if (approval === 'always' && options.allowedTools) {
    options.allowedTools.add(name);
  }

  // Execute tool
  process.stdout.write(formatToolStatus(name, 'running') + '\n');

  try {
    const result = await executor.execute(name, args);
    process.stdout.write(formatToolStatus(name, 'completed') + '\n');

    return {
      toolCallId: toolCall.id,
      name,
      result,
      success: true,
    };
  } catch (error: any) {
    process.stdout.write(formatToolStatus(name, 'failed') + '\n');
    return {
      toolCallId: toolCall.id,
      name,
      result: `Error: ${error.message}`,
      success: false,
    };
  }
}

/**
 * Execute multiple tool calls in sequence
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  executor: any,
  options: ToolApprovalOptions = {}
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(toolCall, executor, options);
    results.push(result);
  }

  return results;
}

/**
 * Format tool result as a chat message
 */
export function formatToolMessage(
  result: ToolExecutionResult
): { role: 'tool'; content: string; tool_call_id: string; name: string } {
  return {
    role: 'tool' as const,
    content: result.result,
    tool_call_id: result.toolCallId,
    name: result.name,
  };
}
