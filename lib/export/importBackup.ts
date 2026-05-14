import { z } from 'zod';

import { saveRecipe } from '@/lib/db/repositories';
import { normalizeRecipe } from '@/lib/recipe/normalize';

const backupSchema = z
  .object({
    exportedAt: z.string().datetime(),
    schema: z.literal('cookagent-recipes-v1'),
    recipes: z.array(z.unknown()),
  })
  .strict();

export interface ImportRecipesResult {
  importedCount: number;
}

export async function importRecipesBackupText(text: string): Promise<ImportRecipesResult> {
  const parsedJson: unknown = JSON.parse(text);
  const backup = backupSchema.parse(parsedJson);
  const recipes = backup.recipes.map((recipe) => normalizeRecipe(recipe));

  await Promise.all(recipes.map((recipe) => saveRecipe(recipe)));

  return {
    importedCount: recipes.length,
  };
}
