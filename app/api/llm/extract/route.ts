import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createLlmProvider, LlmProviderError } from '@/lib/llm/provider';
import { compactDraftToRecipe, compactRecipeDraftSchema } from '@/lib/llm/extractionDraft';
import { fetchRecipeSourceFromUrl } from '@/lib/llm/urlRecipeSource';
import { isIngestAuthorized } from '@/lib/llm/auth';
import { recipeSourceMetadataSchema, recipeSchema } from '@/lib/recipe/schema';
import { normalizeRecipe } from '@/lib/recipe/normalize';

export const runtime = 'nodejs';

const extractionRequestSchema = z
  .object({
    text: z.string().optional(),
    url: z.string().url().optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
    source: recipeSourceMetadataSchema.partial().optional(),
  })
  .strict()
  .refine((value) => value.text?.trim() || value.imageBase64?.trim() || value.url?.trim(), {
    message: 'Provide text input, imageBase64, or url.',
    path: ['text'],
  });

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

function parseJsonOnly(value: string): unknown {
  const trimmed = value.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

    if (fencedMatch?.[1] === undefined) {
      throw new SyntaxError('The LLM response was not valid JSON.');
    }

    return JSON.parse(fencedMatch[1]);
  }
}

function recipeValidationDetails(error: z.ZodError): { issues: z.ZodIssue[]; summary: string[] } {
  return {
    issues: error.issues,
    summary: error.issues.slice(0, 8).map((issue) => {
      const path = issue.path.length === 0 ? 'recipe' : issue.path.join('.');

      return `${path}: ${issue.message}`;
    }),
  };
}

export async function POST(request: Request) {
  if (!isIngestAuthorized(request)) {
    return jsonError(401, 'ingest_unauthorized', 'Ingest token is missing or invalid.');
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_request_json', 'Request body must be valid JSON.');
  }

  const requestResult = extractionRequestSchema.safeParse(body);

  if (!requestResult.success) {
    return jsonError(400, 'invalid_request', 'Extraction request is invalid.', requestResult.error.flatten());
  }

  let extractionInput = requestResult.data;

  if (extractionInput.url !== undefined && !extractionInput.text?.trim() && extractionInput.imageBase64 === undefined) {
    try {
      const fetchedSource = await fetchRecipeSourceFromUrl(extractionInput.url);

      extractionInput = {
        ...extractionInput,
        text: fetchedSource.content,
        source: {
          ...extractionInput.source,
          type: 'url',
          name: extractionInput.source?.name ?? fetchedSource.title ?? extractionInput.url,
          url: extractionInput.url,
          accessedAt: extractionInput.source?.accessedAt ?? new Date().toISOString(),
        },
      };
    } catch (error) {
      return jsonError(422, 'url_fetch_error', error instanceof Error ? error.message : 'Recipe URL could not be loaded.');
    }
  }

  let provider;

  try {
    provider = createLlmProvider();
  } catch (error) {
    if (error instanceof LlmProviderError) {
      return jsonError(error.status, error.code, error.message);
    }

    throw error;
  }

  let rawOutput: string;

  try {
    rawOutput = await provider.extractRecipe(extractionInput);
  } catch (error) {
    if (error instanceof LlmProviderError) {
      return jsonError(error.status, error.code, error.message);
    }

    throw error;
  }

  let parsedOutput: unknown;

  try {
    parsedOutput = parseJsonOnly(rawOutput);
  } catch (error) {
    return jsonError(422, 'invalid_llm_json', 'The LLM output was not valid JSON.', {
      message: error instanceof Error ? error.message : 'Unknown JSON parse error.',
    });
  }

  let recipeResult = recipeSchema.safeParse(parsedOutput);

  if (!recipeResult.success) {
    const normalizedRecipeResult = (() => {
      try {
        return recipeSchema.safeParse(normalizeRecipe(parsedOutput));
      } catch {
        return recipeResult;
      }
    })();

    if (normalizedRecipeResult.success) {
      recipeResult = normalizedRecipeResult;
    }
  }

  if (!recipeResult.success && (provider.name === 'lmstudio' || provider.name === 'cookagent' || provider.name === 'gemini')) {
    const compactDraftResult = compactRecipeDraftSchema.safeParse(parsedOutput);

    if (compactDraftResult.success) {
      recipeResult = recipeSchema.safeParse(compactDraftToRecipe(compactDraftResult.data, extractionInput.source));
    }
  }

  if (!recipeResult.success) {
    const compactDraftResult = compactRecipeDraftSchema.safeParse(parsedOutput);

    if ((provider.name === 'lmstudio' || provider.name === 'cookagent' || provider.name === 'gemini') && !compactDraftResult.success) {
      return jsonError(422, 'compact_recipe_validation_error', 'The LLM output did not match the compact recipe draft schema.', {
        ...recipeValidationDetails(compactDraftResult.error),
      });
    }

    return jsonError(422, 'recipe_validation_error', 'The LLM output did not match the Recipe schema.', {
      ...recipeValidationDetails(recipeResult.error),
    });
  }

  const draft =
    requestResult.data.imageBase64 === undefined
      ? recipeResult.data
      : {
          ...recipeResult.data,
          image: {
            url: null,
            storageKey: null,
            altText: null,
            width: null,
            height: null,
            mimeType: null,
          },
        };

  return NextResponse.json({
    ok: true,
    provider: provider.name,
    draft,
  });
}

export function GET() {
  return jsonError(405, 'method_not_allowed', 'Use POST to extract a recipe draft.');
}
