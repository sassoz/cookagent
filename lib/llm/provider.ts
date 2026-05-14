import type { RecipeSourceMetadata } from '@/lib/recipe/schema';
import { CookAgentRecipeExtractor } from './cookAgentRecipeExtractor';
import { createOpenAICompatibleProvider } from './openaiCompatible';

export type LlmProviderName = 'openai' | 'lmstudio' | 'cookagent' | 'gemini' | 'nvidia';

export interface RecipeExtractionInput {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  source?: Partial<RecipeSourceMetadata>;
  videoUrl?: string;
}

export interface LlmProvider {
  name: LlmProviderName;
  extractRecipe(input: RecipeExtractionInput): Promise<string>;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'configuration_error'
      | 'unsupported_provider'
      | 'provider_capability_error'
      | 'local_server_error'
      | 'provider_request_error',
    public readonly status = 500,
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value === undefined || value.length === 0 ? undefined : value;
}

function envNumber(name: string, fallback: number): number {
  const value = envValue(name);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = envValue(name);

  if (value === undefined) {
    return fallback;
  }

  return value === 'true' || value === '1';
}

function selectedProviderName(): LlmProviderName {
  const provider = envValue('LLM_PROVIDER') ?? 'gemini';

  if (provider === 'openai' || provider === 'lmstudio' || provider === 'cookagent' || provider === 'gemini' || provider === 'nvidia') {
    return provider;
  }

  throw new LlmProviderError(
    `Unsupported LLM_PROVIDER "${provider}". Supported values are "openai", "lmstudio", "cookagent", "gemini", and "nvidia".`,
    'unsupported_provider',
    400,
  );
}

export function createLlmProvider(): LlmProvider {
  const provider = selectedProviderName();

  if (provider === 'lmstudio') {
    return createOpenAICompatibleProvider({
      name: 'lmstudio',
      baseURL: envValue('LMSTUDIO_BASE_URL') ?? 'http://127.0.0.1:1234',
      apiKey: 'lm-studio-local-placeholder',
      model: envValue('LMSTUDIO_MODEL') ?? 'google/gemma-4-e4b',
      supportsImages: false,
      jsonMode: false,
      stream: true,
      promptStyle: 'compact',
      requestOptions: {
        max_tokens: envNumber('LMSTUDIO_MAX_TOKENS', 384),
        temperature: envNumber('LMSTUDIO_TEMPERATURE', 0.1),
        top_p: envNumber('LMSTUDIO_TOP_P', 0.9),
        chat_template_kwargs: {
          enable_thinking: envBoolean('LMSTUDIO_ENABLE_THINKING', false),
        },
      },
    });
  }

  if (provider === 'cookagent') {
    const extractor = new CookAgentRecipeExtractor({
      command: envValue('OPENCLAW_COMMAND') ?? 'openclaw',
      agentId: envValue('COOKAGENT_OPENCLAW_AGENT_ID') ?? 'cookagent',
      timeoutMs: envNumber('COOKAGENT_OPENCLAW_TIMEOUT_MS', 300000),
    });

    return {
      name: 'cookagent',
      extractRecipe(input) {
        return extractor.extract(input);
      },
    };
  }

  if (provider === 'gemini') {
    const apiKey = envValue('GEMINI_API_KEY');

    if (apiKey === undefined) {
      throw new LlmProviderError('GEMINI_API_KEY is required when LLM_PROVIDER=gemini.', 'configuration_error', 500);
    }

    return createOpenAICompatibleProvider({
      name: 'gemini',
      baseURL: envValue('GEMINI_BASE_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey,
      model: envValue('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite-preview',
      supportsImages: true,
      jsonMode: false,
      requestOptions: {
        temperature: envNumber('GEMINI_TEMPERATURE', 0.1),
      },
    });
  }

  if (provider === 'nvidia') {
    const apiKey = envValue('NVIDIA_API_KEY');
    const enableThinking = envBoolean('NVIDIA_ENABLE_THINKING', false);

    if (apiKey === undefined) {
      throw new LlmProviderError('NVIDIA_API_KEY is required when LLM_PROVIDER=nvidia.', 'configuration_error', 500);
    }

    return createOpenAICompatibleProvider({
      name: 'nvidia',
      baseURL: envValue('NVIDIA_BASE_URL') ?? 'https://integrate.api.nvidia.com/v1',
      apiKey,
      model: envValue('NVIDIA_MODEL') ?? 'google/gemma-4-31b-it',
      supportsImages: false,
      jsonMode: false,
      stream: true,
      requestOptions: {
        max_tokens: envNumber('NVIDIA_MAX_TOKENS', 4096),
        temperature: envNumber('NVIDIA_TEMPERATURE', 0.2),
        top_p: envNumber('NVIDIA_TOP_P', 0.9),
        ...(enableThinking ? { chat_template_kwargs: { enable_thinking: true } } : {}),
      },
    });
  }

  const apiKey = envValue('OPENAI_API_KEY');

  if (apiKey === undefined) {
    throw new LlmProviderError('OPENAI_API_KEY is required when LLM_PROVIDER=openai.', 'configuration_error', 500);
  }

  return createOpenAICompatibleProvider({
    name: 'openai',
    baseURL: 'https://api.openai.com/v1',
    apiKey,
    model: envValue('OPENAI_MODEL') ?? 'gpt-4.1-mini',
    supportsImages: true,
  });
}
