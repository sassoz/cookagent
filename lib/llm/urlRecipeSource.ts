interface FetchedRecipeSource {
  content: string;
  title: string | null;
}

type JsonRecord = Record<string, unknown>;

const MAX_SOURCE_CHARS = 20000;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanWhitespace(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function textValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? cleanWhitespace(value) : null;
}

function arrayText(values: unknown): string[] {
  return Array.isArray(values) ? values.map(textValue).filter((value): value is string => value !== null) : [];
}

function recipeTypeMatches(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'recipe';
  }

  return Array.isArray(value) && value.some(recipeTypeMatches);
}

function findRecipeJsonLd(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const recipe = findRecipeJsonLd(item);

      if (recipe !== null) {
        return recipe;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (recipeTypeMatches(value['@type'])) {
    return value;
  }

  return findRecipeJsonLd(value['@graph']);
}

function stepText(step: unknown): string | null {
  if (typeof step === 'string') {
    return cleanWhitespace(step);
  }

  if (!isRecord(step)) {
    return null;
  }

  const name = textValue(step.name);
  const text = textValue(step.text);

  if (name !== null && text !== null && name !== text) {
    return `${name}: ${text}`;
  }

  return text ?? name;
}

function recipeJsonLdToText(recipe: JsonRecord): FetchedRecipeSource {
  const title = textValue(recipe.name);
  const lines = [
    title === null ? null : `Title: ${title}`,
    textValue(recipe.description) === null ? null : `Description: ${textValue(recipe.description)}`,
    textValue(recipe.recipeCategory) === null ? null : `Category: ${textValue(recipe.recipeCategory)}`,
    textValue(recipe.recipeCuisine) === null ? null : `Cuisine: ${textValue(recipe.recipeCuisine)}`,
    textValue(recipe.totalTime) === null ? null : `Total time: ${textValue(recipe.totalTime)}`,
    textValue(recipe.prepTime) === null ? null : `Prep time: ${textValue(recipe.prepTime)}`,
    textValue(recipe.cookTime) === null ? null : `Cook time: ${textValue(recipe.cookTime)}`,
    textValue(recipe.recipeYield) === null ? null : `Yield: ${textValue(recipe.recipeYield)}`,
    '',
    'Instruction handling note: preserve each numbered instruction as a separate recipe step. Section-only headings such as DAY ONE or DAY TWO should become step sections.',
    '',
    'Ingredients:',
    ...arrayText(recipe.recipeIngredient).map((ingredient) => `- ${ingredient}`),
    '',
    'Instructions:',
    ...(Array.isArray(recipe.recipeInstructions)
      ? recipe.recipeInstructions.map(stepText).filter((value): value is string => value !== null).map((instruction, index) => `${index + 1}. ${instruction}`)
      : []),
  ].filter((line): line is string => line !== null);

  return {
    title,
    content: lines.join('\n').slice(0, MAX_SOURCE_CHARS),
  };
}

function htmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match?.[1] === undefined ? null : cleanWhitespace(match[1]);
}

function extractJsonLd(html: string): JsonRecord | null {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const script of scripts) {
    const rawJson = script[1];

    if (rawJson === undefined) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawJson.trim()) as unknown;
      const recipe = findRecipeJsonLd(parsed);

      if (recipe !== null) {
        return recipe;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function htmlToReadableText(html: string): string {
  return cleanWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<(br|p|div|li|h[1-6]|tr)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  ).slice(0, MAX_SOURCE_CHARS);
}

export async function fetchRecipeSourceFromUrl(url: string): Promise<FetchedRecipeSource> {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Recipe URL must use http or https.');
  }

  const response = await fetch(parsedUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Cookagent recipe importer',
    },
  });

  if (!response.ok) {
    throw new Error(`Recipe URL returned HTTP ${response.status}.`);
  }

  const html = await response.text();
  const recipe = extractJsonLd(html);

  if (recipe !== null) {
    return recipeJsonLdToText(recipe);
  }

  return {
    title: htmlTitle(html),
    content: htmlToReadableText(html),
  };
}
