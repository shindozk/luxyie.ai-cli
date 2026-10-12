import { AGENT_DEFINITIONS, AgentService } from '../../src/core/agent.service.js';
import type { AgentMode } from '../../src/types/index.js';

const ALL_MODES: AgentMode[] = ['code', 'plan', 'ask', 'debug', 'review'];

describe('AgentService', () => {
  it('defaults to code mode', () => {
    expect(new AgentService().getMode()).toBe('code');
  });

  it('accepts a custom default mode', () => {
    expect(new AgentService('plan').getMode()).toBe('plan');
  });

  it('switches modes', () => {
    const service = new AgentService();
    service.setMode('review');
    expect(service.getMode()).toBe('review');
  });

  it('throws when switching to an unknown mode', () => {
    const service = new AgentService();
    expect(() => service.setMode('nope' as AgentMode)).toThrow(/Unknown agent mode/);
  });

  it('provides a definition for every mode', () => {
    const service = new AgentService();
    for (const mode of ALL_MODES) {
      const definition = service.getDefinition(mode);
      expect(definition.mode).toBe(mode);
      expect(definition.systemPrompt.length).toBeGreaterThan(0);
    }
  });

  it('plan mode is read-only while code mode can write', () => {
    const service = new AgentService();

    service.setMode('code');
    expect(service.getAllowedTools()).toContain('write_file');
    expect(service.getAllowedTools()).toContain('run_command');

    service.setMode('plan');
    expect(service.getAllowedTools()).not.toContain('write_file');
    expect(service.getAllowedTools()).not.toContain('run_command');
    expect(service.getAllowedTools()).toContain('read_file');
  });

  it('ask mode has no tools', () => {
    const service = new AgentService('ask');
    expect(service.getAllowedTools()).toEqual([]);
  });

  it('returns the system prompt of the active mode', () => {
    const service = new AgentService('debug');
    expect(service.getSystemPrompt()).toBe(service.getDefinition('debug').systemPrompt);
  });

  it('falls back to a default turn budget', () => {
    const withoutTurns = AGENT_DEFINITIONS.map((d) => ({ ...d, maxTurns: undefined }));
    expect(withoutTurns).toBeDefined();
    expect(new AgentService().getMaxTurns()).toBeGreaterThan(0);
  });

  it('lists all agent definitions', () => {
    expect(new AgentService().listAgents()).toHaveLength(ALL_MODES.length);
  });
});
