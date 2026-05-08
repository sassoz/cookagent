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
  return value.trim().toLocaleLowerCase();
}

function includesSearchValue(value: string | null, query: string): boolean {
  return value !== null && normalizeSearchValue(value).includes(query);
}

function arrayIncludesQuery(values: string[], query: string): boolean {
  return values.some((value) => normalizeSearchValue(value).includes(query));
}

function hasAllValues(values: string[], filters: string[] | undefined): boolean {
  if (filters === undefined || filters.length === 0) {
    return true;
  }

  const normalizedValues = new Set(values.map(normalizeSearchValue));

  return filters.every((filter) => normalizedValues.has(normalizeSearchValue(filter)));
}

function matchesQuery(recipe: Recipe, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  return (
    includesSearchValue(recipe.title, query) ||
    includesSearchValue(recipe.description, query) ||
    arrayIncludesQuery(recipe.classification.mainIngredients, query) ||
    arrayIncludesQuery(recipe.classification.tags, query) ||
    arrayIncludesQuery(recipe.classification.dishType, query) ||
    arrayIncludesQuery(recipe.personal.statusTags, query)
  );
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
  const normalizedQuery = normalizeSearchValue(query);
  const recipes = await listRecipes();

  return recipes.filter((recipe) => matchesQuery(recipe, normalizedQuery) && matchesFilters(recipe, filters));
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
