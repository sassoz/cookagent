import { listRecipes, saveRecipe } from '@/lib/db/repositories';
import { recipeSchema, type Recipe } from '@/lib/recipe/schema';
import { syncAuthHeaders } from '@/lib/sync/auth';

interface SyncErrorPayload {
  error?: {
    message?: string;
  };
}

interface PullResponse {
  ok?: boolean;
  recipes?: unknown;
  error?: {
    message?: string;
  };
}

interface PushResponse {
  ok?: boolean;
  saved?: number;
  error?: {
    message?: string;
  };
}

function syncErrorMessage(payload: SyncErrorPayload, fallback: string): string {
  return payload.error?.message ?? fallback;
}

async function parseJsonResponse<T extends SyncErrorPayload>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function pushLocalRecipesToCloud(): Promise<number> {
  const recipes = await listRecipes();
  const response = await fetch('/api/sync/recipes', {
    method: 'PUT',
    headers: {
      ...syncAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipes }),
  });
  const payload = await parseJsonResponse<PushResponse>(response);

  if (!response.ok || payload.ok !== true) {
    throw new Error(syncErrorMessage(payload, 'Recipes could not be pushed to cloud sync.'));
  }

  return payload.saved ?? recipes.length;
}

export async function pullCloudRecipesToLocal(): Promise<number> {
  const response = await fetch('/api/sync/recipes', {
    headers: syncAuthHeaders(),
  });
  const payload = await parseJsonResponse<PullResponse>(response);

  if (!response.ok || payload.ok !== true) {
    throw new Error(syncErrorMessage(payload, 'Recipes could not be pulled from cloud sync.'));
  }

  const result = recipeSchema.array().safeParse(payload.recipes);

  if (!result.success) {
    throw new Error('Cloud sync returned invalid recipe data.');
  }

  const localRecipes = await listRecipes();
  const localById = new Map(localRecipes.map((recipe) => [recipe.id, recipe]));
  let importedCount = 0;

  for (const cloudRecipe of result.data) {
    const localRecipe = localById.get(cloudRecipe.id);

    if (localRecipe === undefined || localRecipe.updatedAt < cloudRecipe.updatedAt) {
      await saveRecipe(cloudRecipe);
      importedCount += 1;
    }
  }

  return importedCount;
}

export async function deleteCloudRecipeById(id: string): Promise<void> {
  const response = await fetch(`/api/sync/recipes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: syncAuthHeaders(),
  });
  const payload = await parseJsonResponse<SyncErrorPayload & { ok?: boolean }>(response);

  if (!response.ok || payload.ok !== true) {
    throw new Error(syncErrorMessage(payload, 'Recipe could not be deleted from cloud sync.'));
  }
}

export type CloudSyncRecipe = Recipe;
