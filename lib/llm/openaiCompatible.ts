import { buildCompactRecipeExtractionPrompt, buildRecipeExtractionPrompt } from './prompts';
import { LlmProviderError, type LlmProvider, type LlmProviderName, type RecipeExtractionInput } from './provider';

interface OpenAICompatibleProviderConfig {
  name: LlmProviderName;
  baseURL: string;
  apiKey: string;
  model: string;
  supportsImages: boolean;
  jsonMode?: boolean;
  stream?: boolean;
  promptStyle?: 'full' | 'compact';
  requestOptions?: Record<string, unknown>;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

type UserContentPart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
      };
    };

function completionUrl(baseURL: string): string {
  const normalizedBaseURL = baseURL.replace(/\/$/, '');
  const openAICompatibleBaseURL = normalizedBaseURL.endsWith('/openai') ? normalizedBaseURL : null;

  if (openAICompatibleBaseURL !== null) {
    return `${openAICompatibleBaseURL}/chat/completions`;
  }

  const openAIBaseURL = normalizedBaseURL.endsWith('/v1') ? normalizedBaseURL : `${normalizedBaseURL}/v1`;

  return `${openAIBaseURL}/chat/completions`;
}

function imageDataUrl(input: RecipeExtractionInput): string | null {
  if (input.imageBase64 === undefined) {
    return null;
  }

  const mimeType = input.imageMimeType ?? 'image/jpeg';

  return input.imageBase64.startsWith('data:') ? input.imageBase64 : `data:${mimeType};base64,${input.imageBase64}`;
}

function errorCauseCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('cause' in error)) {
    return undefined;
  }

  const cause = error.cause;

  if (cause !== null && typeof cause === 'object' && 'code' in cause) {
    const code = cause.code;

    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
}

function isFetchFailure(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }

  return error.message.toLowerCase().includes('fetch failed');
}

function isLikelyConnectionRefused(error: unknown): boolean {
  const causeCode = errorCauseCode(error);

  return causeCode === 'ECONNREFUSED';
}

async function readStreamingContent(response: Response): Promise<string> {
  if (response.body === null) {
    return '';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let reasoningContentLength = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine.startsWith('data:')) {
        continue;
      }

      const data = trimmedLine.slice(5).trim();

      if (data.length === 0 || data === '[DONE]') {
        continue;
      }

      const chunk = JSON.parse(data) as ChatCompletionChunk;
      const nextContent = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content;
      const nextReasoningContent =
        chunk.choices?.[0]?.delta?.reasoning_content ?? chunk.choices?.[0]?.message?.reasoning_content;

      if (nextContent !== undefined && nextContent !== null) {
        content += nextContent;
      }

      if (nextReasoningContent !== undefined && nextReasoningContent !== null) {
        reasoningContentLength += nextReasoningContent.length;
      }
    }
  }

  if (content.trim().length === 0 && reasoningContentLength > 0) {
    throw new LlmProviderError(
      'The local model spent its response budget on hidden reasoning instead of JSON. Disable thinking in LM Studio or use a non-reasoning local model for extraction.',
      'provider_request_error',
      502,
    );
  }

  return content;
}

export function createOpenAICompatibleProvider(config: OpenAICompatibleProviderConfig): LlmProvider {
  return {
    name: config.name,
    async extractRecipe(input) {
      const imageUrl = imageDataUrl(input);

      if (imageUrl !== null && !config.supportsImages) {
        throw new LlmProviderError(
          `${config.name} image extraction is not configured for this provider. Use paste-text extraction or switch to a provider with image support.`,
          'provider_capability_error',
          400,
        );
      }

      const prompt =
        config.promptStyle === 'compact'
          ? buildCompactRecipeExtractionPrompt(input)
          : buildRecipeExtractionPrompt(input);
      let content: string | UserContentPart[] = prompt;

      if (imageUrl !== null) {
        content = [
          {
            type: 'text',
            text: prompt,
          },
        ];
        content.push({
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        });
      }

      let response: Response;

      try {
        response = await fetch(completionUrl(config.baseURL), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: config.stream === true ? 'text/event-stream' : 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            temperature: 0.1,
            ...(config.jsonMode === false ? {} : { response_format: { type: 'json_object' } }),
            ...config.requestOptions,
            stream: config.stream === true,
            messages: [
              {
                role: 'system',
                content:
                  config.promptStyle === 'compact'
                    ? '/no_think\nReturn compact recipe JSON only. Do not reason, plan, explain, or use Markdown.'
                    : 'You extract recipes into strict application JSON. Return valid JSON only, write every user-facing value in Italian, preserve all meaningful cooking details without raw source dumping, and never include raw source text.',
              },
              {
                role: 'user',
                content,
              },
            ],
          }),
        });
      } catch (error) {
        if (config.name === 'lmstudio' && isFetchFailure(error) && isLikelyConnectionRefused(error)) {
          throw new LlmProviderError(
            `Could not connect to LM Studio at ${config.baseURL}. Confirm the local server is running and exposes an OpenAI-compatible API.`,
            'local_server_error',
            503,
          );
        }

        if (config.name === 'lmstudio' && isFetchFailure(error)) {
          throw new LlmProviderError(
            'The LM Studio request ended before a complete response was received. The local model may still be processing the prompt; try a shorter input or a faster/local model setting.',
            'provider_request_error',
            504,
          );
        }

        throw new LlmProviderError('The LLM provider request failed before a response was received.', 'provider_request_error', 502);
      }

      if (config.stream === true) {
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const message =
            response.status === 504
              ? `${config.name} timed out before completing extraction. Try a shorter input, reduce model thinking/max tokens, or use a faster provider/model.`
              : errorText.trim().length > 0
                ? errorText
                : `The LLM provider returned HTTP ${response.status}.`;

          throw new LlmProviderError(message, 'provider_request_error', response.status);
        }

        let streamedContent: string;

        try {
          streamedContent = await readStreamingContent(response);
        } catch {
          throw new LlmProviderError(
            `${config.name} stopped streaming before a complete extraction response was received.`,
            'provider_request_error',
            502,
          );
        }

        if (streamedContent.trim().length === 0) {
          throw new LlmProviderError('The LLM provider returned an empty streamed response.', 'provider_request_error', 502);
        }

        return streamedContent;
      }

      const responseText = await response.text();
      let payload: ChatCompletionResponse = {};

      if (responseText.trim().length > 0) {
        try {
          payload = JSON.parse(responseText) as ChatCompletionResponse;
        } catch {
          payload = {};
        }
      }

      if (!response.ok) {
        const message =
          response.status === 504
            ? `${config.name} timed out before completing extraction. Try a shorter input, reduce model thinking/max tokens, or use a faster provider/model.`
            : (payload.error?.message ?? responseText.trim()) || `The LLM provider returned HTTP ${response.status}.`;

        throw new LlmProviderError(
          message,
          'provider_request_error',
          response.status,
        );
      }

      const contentText = payload.choices?.[0]?.message?.content;

      if (contentText === undefined || contentText === null || contentText.trim().length === 0) {
        throw new LlmProviderError('The LLM provider returned an empty response.', 'provider_request_error', 502);
      }

      return contentText;
    },
  };
}
