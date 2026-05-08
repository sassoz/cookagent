import type { Recipe } from '@/lib/recipe/schema';

// Keep takeout files are local-only and intentionally not committed.
// Seed data must not statically import those files because production builds
// run from the Git repository without the private Keep/ directory.
export const keepRecipeSeedRecipes: Recipe[] = [];
