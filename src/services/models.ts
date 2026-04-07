export interface ModelConfig {
  id: string;
  provider: 'openai' | 'axios';
  temperature: number;
  top_p: number;
  max_tokens: number;
  chat_template_kwargs?: Record<string, any>;
  supportsReasoning?: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "qwen/qwen3.5-397b-a17b",
    provider: "axios",
    temperature: 0.60,
    top_p: 0.95,
    max_tokens: 16384,
    supportsReasoning: true,
    chat_template_kwargs: { enable_thinking: true, top_k: 20, presence_penalty: 0, repetition_penalty: 1 }
  },
  {
    id: "mistralai/mistral-small-4-119b-2603",
    provider: "axios",
    temperature: 0.1,
    top_p: 1.0,
    max_tokens: 16384,
    supportsReasoning: true,
    chat_template_kwargs: { reasoning_effort: "high" }
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    provider: "openai",
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
  },
  {
    id: "google/gemma-4-31b-it",
    provider: "axios",
    temperature: 1.00,
    top_p: 0.95,
    max_tokens: 16384,
    chat_template_kwargs: {"enable_thinking":true},
  },
  {
    id: "z-ai/glm5",
    provider: "openai",
    temperature: 1,
    top_p: 1,
    max_tokens: 16384,
    chat_template_kwargs: {"enable_thinking":true,"clear_thinking":false},
    supportsReasoning: true,
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    provider: "openai",
    temperature: 0.6,
    top_p: 0.7,
    max_tokens: 4096,
  },
  {
    id: "deepseek-ai/deepseek-v3.2",
    provider: "openai",
    temperature: 1,
    top_p: 0.95,
    max_tokens: 8192,
    chat_template_kwargs: {"thinking":true},
    supportsReasoning: true,
  },
  {
    id: "openai/gpt-oss-120b",
    provider: "openai",
    temperature: 1,
    top_p: 1,
    max_tokens: 4096,
    supportsReasoning: true,
  },
  {
    id: "stepfun-ai/step-3.5-flash",
    provider: "openai",
    temperature: 1,
    top_p: 0.9,
    max_tokens: 16384,
    supportsReasoning: true,
  }
];

export function getModelConfig(modelId: string): ModelConfig {
  const config = AVAILABLE_MODELS.find(m => m.id === modelId);
  return config ? config : (AVAILABLE_MODELS[0] as ModelConfig); // fallback to llama-3.3
}
