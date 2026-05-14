interface FetchedRecipeSource {
  author: string | null;
  content: string;
  title: string | null;
  videoUrlForLlm: string | null;
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
    author: textValue(recipe.author),
    title,
    content: lines.join('\n').slice(0, MAX_SOURCE_CHARS),
    videoUrlForLlm: null,
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

function isYouTubeUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  return hostname === 'youtu.be' || hostname === 'www.youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com');
}

function extractBalancedJsonObject(text: string, marker: string): unknown | null {
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const startIndex = text.indexOf('{', markerIndex + marker.length);

  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (character === '\\') {
        isEscaped = true;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(text.slice(startIndex, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function youtubeWatchUrl(url: URL): URL {
  if (url.hostname.toLowerCase().endsWith('youtu.be')) {
    const id = url.pathname.split('/').filter(Boolean)[0];

    if (id !== undefined) {
      return new URL(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`);
    }
  }

  return url;
}

function getRecord(value: unknown, key: string): JsonRecord | null {
  return isRecord(value) && isRecord(value[key]) ? value[key] : null;
}

function getArray(value: unknown, key: string): unknown[] {
  return isRecord(value) && Array.isArray(value[key]) ? value[key] : [];
}

function youtubeVideoDetails(playerResponse: unknown): { author: string | null; description: string | null; title: string | null } {
  const videoDetails = getRecord(playerResponse, 'videoDetails');

  if (videoDetails === null) {
    return { author: null, description: null, title: null };
  }

  return {
    author: textValue(videoDetails.author),
    description: textValue(videoDetails.shortDescription),
    title: textValue(videoDetails.title),
  };
}

function youtubeCaptionTracks(playerResponse: unknown): JsonRecord[] {
  const captions = getRecord(playerResponse, 'captions');
  const renderer = getRecord(captions, 'playerCaptionsTracklistRenderer');

  return getArray(renderer, 'captionTracks').filter(isRecord);
}

function youtubeTrackName(track: JsonRecord): string {
  const name = getRecord(track, 'name');
  const simpleText = textValue(name?.simpleText);
  const runs = getArray(name, 'runs')
    .map((run) => (isRecord(run) ? textValue(run.text) : null))
    .filter((value): value is string => value !== null);

  return simpleText ?? runs.join(' ');
}

function chooseCaptionTrack(tracks: JsonRecord[]): JsonRecord | null {
  const manualTracks = tracks.filter((track) => track.kind !== 'asr');

  return (
    manualTracks.find((track) => textValue(track.languageCode) === 'it') ??
    manualTracks.find((track) => textValue(track.languageCode)?.startsWith('en') === true) ??
    manualTracks[0] ??
    tracks.find((track) => textValue(track.languageCode) === 'it') ??
    tracks.find((track) => textValue(track.languageCode)?.startsWith('en') === true) ??
    tracks[0] ??
    null
  );
}

function captionUrl(track: JsonRecord): URL | null {
  const baseUrl = textValue(track.baseUrl);

  if (baseUrl === null) {
    return null;
  }

  const url = new URL(baseUrl);
  url.searchParams.set('fmt', 'json3');

  return url;
}

function youtubeTranscriptFromJson(value: unknown): string | null {
  const events = getArray(value, 'events');
  const lines = events
    .flatMap((event) => getArray(event, 'segs'))
    .map((segment) => (isRecord(segment) ? textValue(segment.utf8) : null))
    .filter((text): text is string => text !== null)
    .map((text) => text.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  const transcript = cleanWhitespace(lines.join(' '));

  return transcript.length === 0 ? null : transcript;
}

async function fetchYouTubeTranscript(playerResponse: unknown): Promise<{ language: string | null; text: string | null }> {
  const track = chooseCaptionTrack(youtubeCaptionTracks(playerResponse));
  const url = track === null ? null : captionUrl(track);

  if (track === null || url === null) {
    return { language: null, text: null };
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,text/xml',
      'User-Agent': 'Cookagent recipe importer',
    },
  });

  if (!response.ok) {
    return { language: textValue(track.languageCode), text: null };
  }

  try {
    const payload = (await response.json()) as unknown;

    return {
      language: [textValue(track.languageCode), youtubeTrackName(track)].filter(Boolean).join(' - ') || null,
      text: youtubeTranscriptFromJson(payload),
    };
  } catch {
    return { language: textValue(track.languageCode), text: null };
  }
}

async function fetchYouTubeRecipeSource(url: URL): Promise<FetchedRecipeSource> {
  const response = await fetch(youtubeWatchUrl(url), {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Cookagent recipe importer',
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube URL returned HTTP ${response.status}.`);
  }

  const html = await response.text();
  const playerResponse = extractBalancedJsonObject(html, 'ytInitialPlayerResponse');
  const details = youtubeVideoDetails(playerResponse);
  const transcript = playerResponse === null ? { language: null, text: null } : await fetchYouTubeTranscript(playerResponse);
  const lines = [
    'Source kind: YouTube video',
    details.title === null ? null : `Video title: ${details.title}`,
    details.author === null ? null : `Channel: ${details.author}`,
    `URL: ${url.toString()}`,
    details.description === null ? null : `Description: ${details.description}`,
    transcript.language === null ? null : `Transcript language: ${transcript.language}`,
    '',
    transcript.text === null
      ? 'Transcript: Not available. Build only a cautious review draft from the title and description; do not invent missing quantities or steps.'
      : `Transcript:\n${transcript.text}`,
  ].filter((line): line is string => line !== null);

  return {
    author: details.author,
    title: details.title ?? htmlTitle(html),
    content: lines.join('\n').slice(0, MAX_SOURCE_CHARS),
    videoUrlForLlm: transcript.text === null ? youtubeWatchUrl(url).toString() : null,
  };
}

export async function fetchRecipeSourceFromUrl(url: string): Promise<FetchedRecipeSource> {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Recipe URL must use http or https.');
  }

  if (isYouTubeUrl(parsedUrl)) {
    return fetchYouTubeRecipeSource(parsedUrl);
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
    author: null,
    title: htmlTitle(html),
    content: htmlToReadableText(html),
    videoUrlForLlm: null,
  };
}
