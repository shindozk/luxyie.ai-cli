import type { ToolCategory, ToolDefinition, ToolPermissions, ToolResult } from '../types/index.js';

export type ToolHandler = (args: unknown) => Promise<string>;

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

const DEFAULT_CATEGORY_PERMISSIONS: Record<ToolCategory, ToolPermissions> = {
  file: { requiresConfirmation: false },
  shell: { requiresConfirmation: true },
  web: { requiresConfirmation: false },
  code: { requiresConfirmation: false },
  context: { requiresConfirmation: false },
  system: { requiresConfirmation: true },
};

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();
  private readonly defaultPermissions: ToolPermissions;
  private readonly categoryPermissions: Record<ToolCategory, ToolPermissions>;

  constructor(
    options: {
      defaultPermissions?: ToolPermissions;
      categoryPermissions?: Record<ToolCategory, ToolPermissions>;
    } = {},
  ) {
    this.defaultPermissions = options.defaultPermissions ?? { requiresConfirmation: true };
    this.categoryPermissions = options.categoryPermissions ?? DEFAULT_CATEGORY_PERMISSIONS;
  }

  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.function.name, { definition, handler });
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  listTools(): ToolDefinition[] {
    return [...this.tools.values()].map((entry) => entry.definition);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.definition;
  }

  getPermissions(name: string): ToolPermissions {
    const entry = this.tools.get(name);
    if (!entry) {
      return this.defaultPermissions;
    }
    const category = entry.definition.category ?? 'system';
    return (
      entry.definition.permissions ??
      this.categoryPermissions[category] ??
      this.defaultPermissions
    );
  }

  requiresConfirmation(name: string): boolean {
    return this.getPermissions(name).requiresConfirmation;
  }

  async execute(name: string, args: unknown): Promise<ToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      return { success: false, error: `Unknown tool: ${name}` };
    }

    const start = Date.now();
    try {
      const result = await entry.handler(args);
      return { success: true, result, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }
}
