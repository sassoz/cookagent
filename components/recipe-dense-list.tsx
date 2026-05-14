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

const categoryOrder = [
  'Primi',
  'Secondi',
  'Contorni',
  'Zuppe',
  'Pane e lievitati',
  'Dolci',
  'Colazione e snack',
  'Salse e conserve',
  'Bevande',
  'Altro',
];

const categoryAliases: Array<{ aliases: string[]; title: string }> = [
  {
    title: 'Dolci',
    aliases: ['dolce', 'dolci', 'dessert', 'cake', 'cakes', 'torta', 'torte', 'pastry', 'pasticceria', 'gelato', 'ice cream', 'biscotto', 'biscotti', 'cookie', 'cookies', 'crostata'],
  },
  {
    title: 'Pane e lievitati',
    aliases: ['pane', 'bread', 'pizza', 'focaccia', 'lievitato', 'lievitati', 'impasto', 'dough', 'bakery'],
  },
  {
    title: 'Primi',
    aliases: ['primo', 'primi', 'pasta', 'risotto', 'riso', 'gnocchi', 'noodle', 'noodles', 'lasagna', 'lasagne'],
  },
  {
    title: 'Secondi',
    aliases: ['secondo', 'secondi', 'piatto principale', 'main', 'main dish', 'carne', 'meat', 'pollo', 'chicken', 'pesce', 'fish', 'orata', 'tacchino', 'beef', 'pork', 'maiale', 'uova', 'eggs'],
  },
  {
    title: 'Contorni',
    aliases: ['contorno', 'contorni', 'side', 'side dish', 'verdure', 'vegetable', 'vegetables', 'insalata', 'salad', 'melanzane', 'patate', 'potatoes'],
  },
  {
    title: 'Zuppe',
    aliases: ['zuppa', 'zuppe', 'soup', 'soups', 'minestra', 'minestrone', 'vellutata', 'brodo'],
  },
  {
    title: 'Salse e conserve',
    aliases: ['salsa', 'salse', 'sauce', 'sauces', 'condimento', 'dip', 'conserva', 'conserve', 'marmellata', 'jam'],
  },
  {
    title: 'Colazione e snack',
    aliases: ['colazione', 'breakfast', 'snack', 'merenda', 'brunch', 'antipasto', 'starter', 'appetizer'],
  },
  {
    title: 'Bevande',
    aliases: ['bevanda', 'bevande', 'drink', 'drinks', 'cocktail', 'smoothie', 'succo'],
  },
];

function normalizeCategoryValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

function categoryFromValue(value: string): string | null {
  const normalizedValue = normalizeCategoryValue(value);

  if (normalizedValue.length === 0) {
    return null;
  }

  const match = categoryAliases.find((category) => {
    return category.aliases.some((alias) => {
      const normalizedAlias = normalizeCategoryValue(alias);

      return normalizedValue === normalizedAlias || normalizedValue.startsWith(`${normalizedAlias} `);
    });
  });

  return match?.title ?? null;
}

function categoryForRecipe(recipe: Recipe): string {
  const candidates = [
    ...recipe.classification.dishType,
    ...recipe.classification.tags,
    ...recipe.classification.mainIngredients,
  ];

  for (const candidate of candidates) {
    const category = categoryFromValue(candidate);

    if (category !== null) {
      return category;
    }
  }

  return 'Altro';
}

function groupRecipesByCategory(recipes: Recipe[]): RecipeGroup[] {
  const groups = new Map<string, Recipe[]>();

  for (const recipe of recipes) {
    const category = categoryForRecipe(recipe);
    const groupRecipes = groups.get(category) ?? [];

    groupRecipes.push(recipe);
    groups.set(category, groupRecipes);
  }

  return Array.from(groups, ([title, groupRecipes]) => ({
    title,
    recipes: groupRecipes.sort((first, second) => first.title.localeCompare(second.title)),
  })).sort((first, second) => categoryOrder.indexOf(first.title) - categoryOrder.indexOf(second.title));
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

  const groups = useMemo(() => groupRecipesByCategory(recipes), [recipes]);

  return (
    <section className="space-y-3">
      <header className="border-b border-stone-200 pb-3 sm:rounded-md sm:border sm:bg-white sm:p-4 sm:shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">Recipe list</h1>
        <p className="mt-1 text-xs text-stone-600 sm:text-sm">{recipes.length} recipes grouped into simple kitchen categories.</p>
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
