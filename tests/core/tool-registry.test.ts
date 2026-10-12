import { ToolRegistry } from '../../src/core/tool-registry.js';
import type { ToolDefinition } from '../../src/types/index.js';

function makeTool(name: string, category?: ToolDefinition['category']): ToolDefinition {
  const tool: ToolDefinition = {
    type: 'function',
    function: {
      name,
      description: `${name} tool`,
      parameters: { type: 'object', properties: {} },
    },
  };

  if (category !== undefined) {
    tool.category = category;
  }

  return tool;
}

describe('ToolRegistry', () => {
  describe('registration', () => {
    it('registers and retrieves tools by name', () => {
      const registry = new ToolRegistry();
      const tool = makeTool('read_file', 'file');

      registry.register(tool, async () => 'contents');

      expect(registry.has('read_file')).toBe(true);
      expect(registry.getTool('read_file')).toEqual(tool);
      expect(registry.listTools()).toHaveLength(1);
      expect(registry.getTool('missing')).toBeUndefined();
    });

    it('unregisters tools', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('read_file'), async () => 'x');

      expect(registry.unregister('read_file')).toBe(true);
      expect(registry.unregister('read_file')).toBe(false);
    });
  });

  describe('permissions', () => {
    it('requires confirmation for shell tools by default', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('run_command', 'shell'), async () => '');

      expect(registry.requiresConfirmation('run_command')).toBe(true);
    });

    it('does not require confirmation for file tools by default', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('read_file', 'file'), async () => '');

      expect(registry.requiresConfirmation('read_file')).toBe(false);
    });

    it('prefers explicit tool permissions over category defaults', () => {
      const registry = new ToolRegistry();
      const tool = makeTool('dangerous_tool', 'file');
      tool.permissions = { requiresConfirmation: true };

      registry.register(tool, async () => '');

      expect(registry.requiresConfirmation('dangerous_tool')).toBe(true);
    });

    it('honours custom category permissions', () => {
      const registry = new ToolRegistry({
        categoryPermissions: {
          file: { requiresConfirmation: true },
          shell: { requiresConfirmation: true },
          web: { requiresConfirmation: true },
          code: { requiresConfirmation: true },
          context: { requiresConfirmation: true },
          system: { requiresConfirmation: true },
        },
      });

      registry.register(makeTool('read_file', 'file'), async () => '');

      expect(registry.requiresConfirmation('read_file')).toBe(true);
    });

    it('falls back to default permissions for tools without a category', () => {
      const registry = new ToolRegistry({ defaultPermissions: { requiresConfirmation: true } });
      registry.register(makeTool('mystery'), async () => '');

      expect(registry.requiresConfirmation('mystery')).toBe(true);
    });
  });

  describe('execution', () => {
    it('executes a handler and reports success', async () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('read_file', 'file'), async (args) => {
        const { path } = args as { path: string };
        return `contents of ${path}`;
      });

      const result = await registry.execute('read_file', { path: '/tmp/a.ts' });

      expect(result.success).toBe(true);
      expect(result.result).toBe('contents of /tmp/a.ts');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('returns an error for unknown tools', async () => {
      const registry = new ToolRegistry();

      const result = await registry.execute('nope', {});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unknown tool/);
    });

    it('captures handler failures as error results', async () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('run_command', 'shell'), async () => {
        throw new Error('boom');
      });

      const result = await registry.execute('run_command', { command: 'rm -rf /' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('boom');
    });
  });
});
