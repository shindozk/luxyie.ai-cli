export interface PlatformInfo {
  os: string;
  arch: string;
  nodeVersion: string;
  shell: string;
  isTTY: boolean;
  isCI: boolean;
  termProgram?: string;
  termVersion?: string;
  colorSupport: 'none' | 'basic' | '256' | 'truecolor';
  unicodeSupport: boolean;
}

export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  jsonMode: boolean;
  parallelTools: boolean;
  systemPrompt: boolean;
}
