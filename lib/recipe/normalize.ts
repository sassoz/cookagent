import { createEmptyRecipe } from './defaults';
import { type Recipe, recipeSchema } from './schema';

type RecipeRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RecipeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeRecord<T extends RecipeRecord>(defaults: T, input: unknown): T {
  if (!isRecord(input)) {
    return defaults;
  }

  return {
    ...defaults,
    ...input,
  };
}

function mergeNestedRecipe(defaults: Recipe, input: unknown): RecipeRecord {
  const base = mergeRecord(defaults, input);

  return {
    ...base,
    image: mergeRecord(defaults.image, base.image),
    source: mergeRecord(defaults.source, base.source),
    servings: mergeRecord(defaults.servings, base.servings),
    times: mergeRecord(defaults.times, base.times),
    classification: mergeRecord(defaults.classification, base.classification),
    personal: mergeRecord(defaults.personal, base.personal),
    markdown: mergeRecord(defaults.markdown, base.markdown),
  };
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function computeTotalTime(times: Pick<Recipe['times'], 'prepMinutes' | 'cookMinutes' | 'restMinutes'>): number | null {
  const values = [times.prepMinutes, times.cookMinutes, times.restMinutes];
  const knownValues = values.filter((value): value is number => typeof value === 'number');

  if (knownValues.length === 0) {
    return null;
  }

  return knownValues.reduce((total, value) => total + value, 0);
}

export function normalizeRecipe(input: unknown): Recipe {
  const defaults = createEmptyRecipe();
  const merged = mergeNestedRecipe(defaults, input);
  const times = mergeRecord(defaults.times, merged.times);
  const classification = mergeRecord(defaults.classification, merged.classification);
  const personal = mergeRecord(defaults.personal, merged.personal);
  const totalMinutes = typeof times.totalMinutes === 'number' ? times.totalMinutes : computeTotalTime(times);
  const now = new Date().toISOString();

  return recipeSchema.parse({
    ...merged,
    times: {
      ...times,
      totalMinutes,
    },
    ingredients: arrayOrEmpty(merged.ingredients),
    steps: arrayOrEmpty(merged.steps),
    notes: arrayOrEmpty(merged.notes),
    classification: {
      ...classification,
      dishType: arrayOrEmpty(classification.dishType),
      mainIngredients: arrayOrEmpty(classification.mainIngredients),
      season: arrayOrEmpty(classification.season),
      dietary: arrayOrEmpty(classification.dietary),
      tags: arrayOrEmpty(classification.tags),
      cuisine: arrayOrEmpty(classification.cuisine),
    },
    personal: {
      ...personal,
      comments: arrayOrEmpty(personal.comments),
      cookedSessions: arrayOrEmpty(personal.cookedSessions),
      statusTags: arrayOrEmpty(personal.statusTags),
    },
    createdAt: typeof merged.createdAt === 'string' ? merged.createdAt : now,
    updatedAt: typeof merged.updatedAt === 'string' ? merged.updatedAt : now,
  });
}

export function updateRecipeTimestamp(recipe: Recipe, date = new Date()): Recipe {
  return recipeSchema.parse({
    ...recipe,
    updatedAt: date.toISOString(),
  });
}
