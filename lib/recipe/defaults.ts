import type { Recipe } from './schema';

function createRecipeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `recipe-${Date.now().toString(36)}`;
}

export function createEmptyRecipe(): Recipe {
  const now = new Date().toISOString();

  return {
    id: createRecipeId(),
    title: 'Untitled recipe',
    description: null,
    image: {
      url: null,
      storageKey: null,
      altText: null,
      width: null,
      height: null,
      mimeType: null,
    },
    source: {
      type: 'manual',
      name: null,
      url: null,
      author: null,
      publishedAt: null,
      accessedAt: null,
    },
    servings: {
      quantity: null,
      unit: null,
      note: null,
    },
    times: {
      prepMinutes: null,
      cookMinutes: null,
      restMinutes: null,
      totalMinutes: null,
    },
    ingredients: [],
    steps: [],
    notes: [],
    classification: {
      dishType: [],
      complexity: null,
      mainIngredients: [],
      season: [],
      dietary: [],
      tags: [],
      cuisine: [],
    },
    personal: {
      rating: null,
      comments: [],
      cookedSessions: [],
      statusTags: [],
    },
    markdown: {
      intro: null,
      methodNotes: null,
      variations: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}
