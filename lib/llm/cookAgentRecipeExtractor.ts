import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { buildRecipeExtractionPrompt } from './prompts';
import { LlmProviderError, type RecipeExtractionInput } from './provider';

const execFileAsync = promisify(execFile);

interface CookAgentRecipeExtractorConfig {
  command: string;
  agentId: string;
  timeoutMs: number;
}

interface OpenClawJsonOutput {
  content?: unknown;
  message?: unknown;
  output?: unknown;
  response?: unknown;
  text?: unknown;
  error?: {
    message?: string;
  };
}

function firstTextValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    if (Array.isArray(value)) {
      const nestedText = firstTextValue(...value);

      if (nestedText !== null) {
        return nestedText;
      }
    }

    if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const nestedText = firstTextValue(record.content, record.text, record.message, record.output, record.response);

      if (nestedText !== null) {
        return nestedText;
      }
    }
  }

  return null;
}

function outputText(stdout: string): string {
  const trimmedStdout = stdout.trim();

  if (trimmedStdout.length === 0) {
    throw new LlmProviderError('OpenClaw returned an empty response.', 'provider_request_error', 502);
  }

  let parsedOutput: OpenClawJsonOutput;

  try {
    parsedOutput = JSON.parse(trimmedStdout) as OpenClawJsonOutput;
  } catch {
    return trimmedStdout;
  }

  if (parsedOutput.error?.message !== undefined) {
    throw new LlmProviderError(parsedOutput.error.message, 'provider_request_error', 502);
  }

  const text = firstTextValue(
    parsedOutput.content,
    parsedOutput.message,
    parsedOutput.output,
    parsedOutput.response,
    parsedOutput.text,
  );

  if (text === null) {
    return trimmedStdout;
  }

  return text;
}

export class CookAgentRecipeExtractor {
  constructor(private readonly config: CookAgentRecipeExtractorConfig) {}

  async extract(input: RecipeExtractionInput): Promise<string> {
    if (input.imageBase64 !== undefined) {
      throw new LlmProviderError(
        'Cookagent OpenClaw extraction currently supports pasted text only. Use text input or a provider with image support.',
        'provider_capability_error',
        400,
      );
    }

    if (input.videoUrl !== undefined) {
      throw new LlmProviderError(
        'Cookagent OpenClaw extraction currently supports pasted text only. Use Gemini for YouTube videos without public transcripts.',
        'provider_capability_error',
        400,
      );
    }

    const prompt = buildRecipeExtractionPrompt(input);

    try {
      const { stdout } = await execFileAsync(
        this.config.command,
        ['agent', '--agent', this.config.agentId, '--message', prompt, '--json'],
        {
          timeout: this.config.timeoutMs,
          windowsHide: true,
          maxBuffer: 1024 * 1024 * 8,
        },
      );

      return outputText(stdout);
    } catch (error) {
      if (error instanceof LlmProviderError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'OpenClaw extraction failed.';

      throw new LlmProviderError(`OpenClaw extraction failed: ${message}`, 'provider_request_error', 502);
    }
  }
}
