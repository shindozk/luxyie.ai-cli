import type { AgentDefinition, AgentMode } from '../types/index.js';

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    mode: 'code',
    name: 'Code',
    description: 'Write, edit, and refactor code autonomously',
    systemPrompt:
      'You are an expert software engineer. Write clean, correct, and well-structured code. Follow the project conventions and preserve existing functionality.',
    allowedTools: ['read_file', 'write_file', 'list_directory', 'run_command'],
    allowedToolCategories: ['file', 'shell', 'code'],
    maxTurns: 50,
    capabilities: [
      { name: 'file-editing', description: 'Create and modify files', enabled: true },
      { name: 'command-execution', description: 'Run shell commands', enabled: true },
      { name: 'code-analysis', description: 'Analyze code structure', enabled: true },
    ],
  },
  {
    mode: 'plan',
    name: 'Plan',
    description: 'Analyze requirements and produce implementation plans without editing',
    systemPrompt:
      'You are a software architect. Analyze requirements and produce detailed, actionable implementation plans. Do not modify any files.',
    allowedTools: ['read_file', 'list_directory'],
    allowedToolCategories: ['file', 'code'],
    maxTurns: 20,
    capabilities: [
      { name: 'read-only', description: 'Read files and directories', enabled: true },
      { name: 'planning', description: 'Create implementation plans', enabled: true },
    ],
  },
  {
    mode: 'ask',
    name: 'Ask',
    description: 'Answer questions with focused, concise responses',
    systemPrompt:
      'You are a knowledgeable assistant. Answer questions clearly and concisely with practical examples.',
    allowedTools: [],
    allowedToolCategories: [],
    maxTurns: 5,
    capabilities: [{ name: 'qa', description: 'Answer questions', enabled: true }],
  },
  {
    mode: 'debug',
    name: 'Debug',
    description: 'Diagnose and fix errors systematically',
    systemPrompt:
      'You are a debugging expert. Diagnose errors, trace root causes, and propose precise fixes.',
    allowedTools: ['read_file', 'list_directory', 'run_command'],
    allowedToolCategories: ['file', 'shell', 'code'],
    maxTurns: 30,
    capabilities: [
      { name: 'diagnostics', description: 'Run diagnostic commands', enabled: true },
      { name: 'root-cause', description: 'Trace error root causes', enabled: true },
    ],
  },
  {
    mode: 'review',
    name: 'Review',
    description: 'Review code for quality, security, and correctness',
    systemPrompt:
      'You are a code reviewer. Review code for bugs, security issues, and quality improvements.',
    allowedTools: ['read_file', 'list_directory'],
    allowedToolCategories: ['file', 'code'],
    maxTurns: 15,
    capabilities: [
      { name: 'static-analysis', description: 'Static code analysis', enabled: true },
      { name: 'security-review', description: 'Security vulnerability review', enabled: true },
    ],
  },
];

export class AgentService {
  private mode: AgentMode;
  private readonly definitions: Map<AgentMode, AgentDefinition>;

  constructor(defaultMode: AgentMode = 'code') {
    this.mode = defaultMode;
    this.definitions = new Map(AGENT_DEFINITIONS.map((definition) => [definition.mode, definition]));
  }

  getMode(): AgentMode {
    return this.mode;
  }

  setMode(mode: AgentMode): void {
    this.getDefinition(mode);
    this.mode = mode;
  }

  getDefinition(mode: AgentMode): AgentDefinition {
    const definition = this.definitions.get(mode);
    if (!definition) {
      throw new Error(`Unknown agent mode: ${mode}`);
    }
    return definition;
  }

  listAgents(): AgentDefinition[] {
    return [...AGENT_DEFINITIONS];
  }

  getSystemPrompt(): string {
    return this.getDefinition(this.mode).systemPrompt;
  }

  getAllowedTools(): string[] {
    return this.getDefinition(this.mode).allowedTools;
  }

  getAllowedToolCategories(): AgentDefinition['allowedToolCategories'] {
    return this.getDefinition(this.mode).allowedToolCategories;
  }

  getMaxTurns(): number {
    return this.getDefinition(this.mode).maxTurns ?? 25;
  }
}
