import { db, type RecipeDraft } from './dexie';
import { normalizeRecipe, updateRecipeTimestamp } from '@/lib/recipe/normalize';
import type { Recipe, RecipeComplexity, RecipeStatusTag } from '@/lib/recipe/schema';
import { syncAuthHeaders } from '@/lib/sync/auth';

export interface RecipeSearchFilters {
  complexity?: RecipeComplexity[];
  dishType?: string[];
  mainIngredients?: string[];
  season?: string[];
  statusTags?: RecipeStatusTag[];
  tags?: string[];
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

function searchTokens(query: string): string[] {
  return normalizeSearchValue(query)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 2);
}

function searchableWords(value: string): string[] {
  return normalizeSearchValue(value)
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function searchTokenVariants(token: string): string[] {
  const variants = new Set([token]);
  const lastCharacter = token.at(-1);
  const prefix = token.slice(0, -1);

  if (token.length >= 4) {
    if (lastCharacter === 'a') {
      variants.add(`${prefix}e`);
    } else if (lastCharacter === 'e') {
      variants.add(`${prefix}i`);
    } else if (lastCharacter === 'o') {
      variants.add(`${prefix}i`);
    } else if (lastCharacter === 'i') {
      variants.add(`${prefix}o`);
      variants.add(`${prefix}e`);
    }
  }

  return Array.from(variants);
}

function tokenMatchesValue(value: string | null, token: string): boolean {
  if (value === null) {
    return false;
  }

  const variants = searchTokenVariants(token);

  return searchableWords(value).some((word) => variants.some((variant) => word.startsWith(variant)));
}

function tokenMatchesArray(values: string[], token: string): boolean {
  return values.some((value) => tokenMatchesValue(value, token));
}

function hasAllValues(values: string[], filters: string[] | undefined): boolean {
  if (filters === undefined || filters.length === 0) {
    return true;
  }

  const normalizedValues = new Set(values.map(normalizeSearchValue));

  return filters.every((filter) => normalizedValues.has(normalizeSearchValue(filter)));
}

function matchesQuery(recipe: Recipe, tokens: string[], hasSearchQuery: boolean): boolean {
  if (tokens.length === 0) {
    return !hasSearchQuery;
  }

  return tokens.every((token) => {
    return (
      tokenMatchesValue(recipe.title, token) ||
      tokenMatchesValue(recipe.description, token) ||
      tokenMatchesValue(recipe.source.name, token) ||
      tokenMatchesValue(recipe.source.author, token) ||
      tokenMatchesValue(recipe.source.url, token) ||
      tokenMatchesArray(recipe.ingredients.map((ingredient) => ingredient.item), token) ||
      tokenMatchesArray(recipe.steps.map((step) => step.text), token) ||
      tokenMatchesArray(recipe.classification.mainIngredients, token) ||
      tokenMatchesArray(recipe.classification.tags, token) ||
      tokenMatchesArray(recipe.classification.dishType, token) ||
      tokenMatchesArray(recipe.classification.cuisine, token) ||
      tokenMatchesArray(recipe.personal.statusTags, token)
    );
  });
}

function matchesFilters(recipe: Recipe, filters: RecipeSearchFilters): boolean {
  const complexityMatches =
    filters.complexity === undefined ||
    filters.complexity.length === 0 ||
    (recipe.classification.complexity !== null && filters.complexity.includes(recipe.classification.complexity));

  return (
    complexityMatches &&
    hasAllValues(recipe.classification.tags, filters.tags) &&
    hasAllValues(recipe.classification.mainIngredients, filters.mainIngredients) &&
    hasAllValues(recipe.classification.dishType, filters.dishType) &&
    hasAllValues(recipe.classification.season, filters.season) &&
    hasAllValues(recipe.personal.statusTags, filters.statusTags)
  );
}

function canUseBrowserSync(): boolean {
  return typeof window !== 'undefined';
}

function pushRecipeToCloud(recipe: Recipe): void {
  if (!canUseBrowserSync()) {
    return;
  }

  void fetch('/api/sync/recipes', {
    method: 'PUT',
    headers: {
      ...syncAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipes: [recipe] }),
  }).catch(() => {
    // Local-first writes must not fail just because cloud sync is unavailable.
  });
}

function deleteRecipeFromCloud(id: string): void {
  if (!canUseBrowserSync()) {
    return;
  }

  void fetch(`/api/sync/recipes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: syncAuthHeaders(),
  }).catch(() => {
    // Local-first deletes must not fail just because cloud sync is unavailable.
  });
}

export async function listRecipes(): Promise<Recipe[]> {
  return db.recipes.orderBy('updatedAt').reverse().toArray();
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const recipe = await db.recipes.get(id);

  return recipe === undefined ? undefined : normalizeRecipe(recipe);
}

export async function saveRecipe(recipe: Recipe): Promise<string> {
  const normalizedRecipe = updateRecipeTimestamp(normalizeRecipe(recipe));

  await db.recipes.put(normalizedRecipe);
  pushRecipeToCloud(normalizedRecipe);

  return normalizedRecipe.id;
}

export async function deleteRecipe(id: string): Promise<void> {
  await db.recipes.delete(id);
  deleteRecipeFromCloud(id);
}

export async function searchRecipes(query: string, filters: RecipeSearchFilters = {}): Promise<Recipe[]> {
  const hasSearchQuery = normalizeSearchValue(query).length > 0;
  const tokens = searchTokens(query);
  const recipes = await listRecipes();

  return recipes.filter((recipe) => matchesQuery(recipe, tokens, hasSearchQuery) && matchesFilters(recipe, filters));
}

export async function saveDraft(draft: RecipeDraft): Promise<string> {
  const now = new Date().toISOString();
  const existingDraft = await db.recipeDrafts.get(draft.id);
  const recipeDraft: RecipeDraft = {
    ...draft,
    createdAt: existingDraft?.createdAt ?? draft.createdAt ?? now,
    updatedAt: now,
  };

  await db.recipeDrafts.put(recipeDraft);

  return recipeDraft.id;
}

export async function getDraft(id: string): Promise<RecipeDraft | undefined> {
  return db.recipeDrafts.get(id);
}

export async function deleteDraft(id: string): Promise<void> {
  await db.recipeDrafts.delete(id);
}
