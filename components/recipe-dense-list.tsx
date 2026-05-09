'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { listRecipes } from '@/lib/db/repositories';
import { seedDevelopmentRecipes } from '@/lib/db/seed';
import type { Recipe } from '@/lib/recipe/schema';

interface RecipeGroup {
  title: string;
  recipes: Recipe[];
}

function groupRecipesByDishType(recipes: Recipe[]): RecipeGroup[] {
  const groups = new Map<string, Recipe[]>();

  for (const recipe of recipes) {
    const dishTypes = recipe.classification.dishType.length === 0 ? ['Uncategorized'] : recipe.classification.dishType;

    for (const dishType of dishTypes) {
      const normalizedDishType = dishType.trim() || 'Uncategorized';
      const groupRecipes = groups.get(normalizedDishType) ?? [];

      groupRecipes.push(recipe);
      groups.set(normalizedDishType, groupRecipes);
    }
  }

  return Array.from(groups, ([title, groupRecipes]) => ({
    title,
    recipes: groupRecipes.sort((first, second) => first.title.localeCompare(second.title)),
  })).sort((first, second) => first.title.localeCompare(second.title));
}

export function RecipeDenseList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes() {
      try {
        setIsLoading(true);
        await seedDevelopmentRecipes();
        const storedRecipes = await listRecipes();

        if (isMounted) {
          setRecipes(storedRecipes);
        }
      } catch {
        if (isMounted) {
          setError('Recipe list could not be loaded.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipes();

    return () => {
      isMounted = false;
    };
  }, []);

  const groups = useMemo(() => groupRecipesByDishType(recipes), [recipes]);

  return (
    <section className="space-y-3">
      <header className="border-b border-stone-200 pb-3 sm:rounded-md sm:border sm:bg-white sm:p-4 sm:shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">Recipe list</h1>
        <p className="mt-1 text-xs text-stone-600 sm:text-sm">{recipes.length} recipes grouped by dish type.</p>
      </header>

      {error === null ? null : (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {isLoading ? (
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">Loading recipes...</div>
      ) : groups.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">No recipes found.</div>
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white sm:grid sm:gap-3 sm:border-0 sm:bg-transparent lg:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title} className="border-b border-stone-200 last:border-b-0 sm:rounded-md sm:border sm:bg-white sm:p-3 sm:shadow-sm">
              <div className="flex items-baseline justify-between gap-3 bg-stone-50 px-3 py-2 sm:border-b sm:border-stone-100 sm:bg-white sm:px-0 sm:pb-2 sm:pt-0">
                <h2 className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-stone-600 sm:text-sm">{group.title}</h2>
                <span className="text-xs font-medium text-stone-400">{group.recipes.length}</span>
              </div>
              <ul className="divide-y divide-stone-100">
                {group.recipes.map((recipe) => (
                  <li key={`${group.title}-${recipe.id}`}>
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="block truncate px-3 py-1.5 text-sm font-medium leading-5 text-stone-900 transition hover:text-emerald-800 sm:px-0 sm:py-2"
                    >
                      {recipe.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
