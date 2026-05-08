import { getRecipe } from './repositories';
import { db } from '@/lib/db/dexie';
import { keepRecipeSeedRecipes } from '@/lib/db/keepRecipeSeed';
import { normalizeRecipe } from '@/lib/recipe/normalize';
import type { Recipe } from '@/lib/recipe/schema';

const removedDevelopmentSeedRecipeIds = ['dev-lentil-soup', 'dev-sheet-pan-gnocchi', 'dev-overnight-focaccia'];

const developmentSeedRecipes: Recipe[] = [];

async function saveLocalSeedRecipe(recipe: Recipe): Promise<void> {
  await db.recipes.put(normalizeRecipe(recipe));
}

function shouldRefreshKeepSeed(existingRecipe: Recipe, seedRecipe: Recipe): boolean {
  return seedRecipe.id.startsWith('keep-') && existingRecipe.markdown.methodNotes !== seedRecipe.markdown.methodNotes;
}

export async function seedDevelopmentRecipes(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  await db.recipes.bulkDelete(removedDevelopmentSeedRecipeIds);

  await Promise.all(
    [...developmentSeedRecipes, ...keepRecipeSeedRecipes].map(async (recipe) => {
      const existingRecipe = await getRecipe(recipe.id);

      if (existingRecipe === undefined) {
        await saveLocalSeedRecipe(recipe);
        return;
      }

      if (existingRecipe.image.url === null && recipe.image.url !== null) {
        await saveLocalSeedRecipe({
          ...existingRecipe,
          image: recipe.image,
        });
        return;
      }

      if (shouldRefreshKeepSeed(existingRecipe, recipe)) {
        const now = new Date().toISOString();

        await saveLocalSeedRecipe({
          ...existingRecipe,
          notes: Array.from(new Set([...existingRecipe.notes, ...recipe.notes])),
          markdown: {
            ...existingRecipe.markdown,
            intro: existingRecipe.markdown.intro ?? recipe.markdown.intro,
            methodNotes: recipe.markdown.methodNotes,
            variations: existingRecipe.markdown.variations ?? recipe.markdown.variations,
          },
          updatedAt: now,
        });
      }
    }),
  );
}
