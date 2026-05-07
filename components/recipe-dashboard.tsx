'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { listRecipes, searchRecipes, type RecipeSearchFilters } from '@/lib/db/repositories';
import { seedDevelopmentRecipes } from '@/lib/db/seed';
import {
  formatComplexity,
  formatDate,
  getLastCookedDate,
} from '@/lib/recipe/display';
import { recipeComplexityValues, recipeStatusTagValues, type Recipe, type RecipeComplexity, type RecipeStatusTag } from '@/lib/recipe/schema';

interface RecipeDashboardProps {
  heading?: string;
  intro?: string;
}

interface FilterState {
  complexity: '' | RecipeComplexity;
  dishType: string;
  mainIngredient: string;
  query: string;
  season: string;
  statusTag: '' | RecipeStatusTag;
  tag: string;
}

const emptyFilters: FilterState = {
  complexity: '',
  dishType: '',
  mainIngredient: '',
  query: '',
  season: '',
  statusTag: '',
  tag: '',
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((first, second) => first.localeCompare(second));
}

function buildSearchFilters(filters: FilterState): RecipeSearchFilters {
  return {
    complexity: filters.complexity === '' ? undefined : [filters.complexity],
    dishType: filters.dishType === '' ? undefined : [filters.dishType],
    mainIngredients: filters.mainIngredient === '' ? undefined : [filters.mainIngredient],
    season: filters.season === '' ? undefined : [filters.season],
    statusTags: filters.statusTag === '' ? undefined : [filters.statusTag],
    tags: filters.tag === '' ? undefined : [filters.tag],
  };
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LocalStatusPanel({ recipes }: { recipes: Recipe[] }) {
  const cookedRecipes = recipes.filter((recipe) => recipe.personal.cookedSessions.length > 0).length;

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-stone-500">Local library</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{recipes.length}</p>
        <p className="mt-1 text-sm text-stone-600">recipes in this browser</p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-stone-500">Cooked</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{cookedRecipes}</p>
        <p className="mt-1 text-sm text-stone-600">with session history</p>
      </div>
      <div className="rounded-md border border-emerald-900/10 bg-emerald-950 p-4 text-emerald-50 shadow-sm">
        <p className="text-xs font-semibold uppercase text-emerald-100/70">Offline ready</p>
        <p className="mt-2 text-sm leading-6 text-emerald-50/90">
          Recipes are stored in IndexedDB and stay available without a network connection.
        </p>
      </div>
    </section>
  );
}

export function RecipeDashboard({
  heading = 'Recipes',
  intro = 'Browse locally stored recipes and narrow the list with practical kitchen filters.',
}: RecipeDashboardProps) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [visibleRecipes, setVisibleRecipes] = useState<Recipe[]>([]);
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
          setError('Recipe storage could not be loaded.');
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

  useEffect(() => {
    let isMounted = true;

    async function applyFilters() {
      try {
        const results = await searchRecipes(filters.query, buildSearchFilters(filters));

        if (isMounted) {
          setVisibleRecipes(results);
        }
      } catch {
        if (isMounted) {
          setError('Recipes could not be filtered.');
        }
      }
    }

    void applyFilters();

    return () => {
      isMounted = false;
    };
  }, [filters, recipes]);

  const filterOptions = useMemo(
    () => ({
      dishTypes: uniqueSorted(recipes.flatMap((recipe) => recipe.classification.dishType)),
      mainIngredients: uniqueSorted(recipes.flatMap((recipe) => recipe.classification.mainIngredients)),
      seasons: uniqueSorted(recipes.flatMap((recipe) => recipe.classification.season)),
      tags: uniqueSorted(recipes.flatMap((recipe) => recipe.classification.tags)),
    }),
    [recipes],
  );

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');
  const todayRecipe = visibleRecipes[0] ?? recipes[0] ?? null;

  return (
    <section className="space-y-6">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <header className="rounded-md border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 max-w-3xl">
                <h1 className="break-words text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">{heading}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{intro}</p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:w-44">
                <Link
                  href="/ingest"
                  className="inline-flex h-11 max-w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  Ingest recipe
                </Link>
                <Link
                  href="/recipes/new"
                  className="inline-flex h-11 max-w-full items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition hover:border-stone-400"
                >
                  Add manually
                </Link>
              </div>
            </div>
          </header>

          <div className="grid min-w-0 gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-stone-700 sm:col-span-2 lg:col-span-3">
              <span>Search recipes</span>
              <input
                type="search"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Title, description, tags, ingredients..."
                className="h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              />
            </label>

            <FilterSelect
              label="Dish type"
              value={filters.dishType}
              onChange={(dishType) => setFilters((current) => ({ ...current, dishType }))}
              options={filterOptions.dishTypes}
            />
            <FilterSelect
              label="Complexity"
              value={filters.complexity}
              onChange={(complexity) => setFilters((current) => ({ ...current, complexity: complexity as FilterState['complexity'] }))}
              options={[...recipeComplexityValues]}
            />
            <FilterSelect
              label="Status"
              value={filters.statusTag}
              onChange={(statusTag) => setFilters((current) => ({ ...current, statusTag: statusTag as FilterState['statusTag'] }))}
              options={[...recipeStatusTagValues]}
            />
            <FilterSelect
              label="Season"
              value={filters.season}
              onChange={(season) => setFilters((current) => ({ ...current, season }))}
              options={filterOptions.seasons}
            />
            <FilterSelect
              label="Main ingredient"
              value={filters.mainIngredient}
              onChange={(mainIngredient) => setFilters((current) => ({ ...current, mainIngredient }))}
              options={filterOptions.mainIngredients}
            />
            <FilterSelect
              label="Custom tag"
              value={filters.tag}
              onChange={(tag) => setFilters((current) => ({ ...current, tag }))}
              options={filterOptions.tags}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFilters(emptyFilters)}
                disabled={!hasActiveFilters}
                className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-5">
          <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">Today</h2>
              <span className="text-xs font-semibold uppercase text-emerald-800">Kitchen mode</span>
            </div>
            {todayRecipe === null ? (
              <p className="mt-3 text-sm leading-6 text-stone-600">Add a recipe to start building your local rotation.</p>
            ) : (
              <Link href={`/recipes/${todayRecipe.id}`} className="mt-4 block overflow-hidden rounded-md border border-stone-200">
                {todayRecipe.image.url === null ? null : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={todayRecipe.image.url} alt={todayRecipe.image.altText ?? todayRecipe.title} className="aspect-[5/3] w-full object-cover" />
                )}
                <div className="p-3">
                  <p className="text-base font-semibold text-stone-950">{todayRecipe.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">
                    {todayRecipe.description ?? 'Open the recipe for ingredients, steps, and print view.'}
                  </p>
                </div>
              </Link>
            )}
            <div className="mt-4 grid gap-2">
              <Link href="/ingest" className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-3 text-sm font-semibold text-white">
                Ingest recipe
              </Link>
              <Link href="/settings" className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800">
                Export backup
              </Link>
            </div>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Review before save</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              AI extraction creates a structured draft first. Raw recipe input is not stored by default.
            </p>
          </div>
        </aside>
      </div>

      {error === null ? null : (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {isLoading ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">Loading recipes...</div>
      ) : visibleRecipes.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">No recipes found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            Add a recipe from pasted text or images, or clear filters to widen the local library.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/ingest" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
              Go to ingest
            </Link>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => setFilters(emptyFilters)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleRecipes.map((recipe) => {
            const lastCookedDate = getLastCookedDate(recipe);
            const tags = [...recipe.classification.tags, ...recipe.personal.statusTags].slice(0, 4);

            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="rounded-md border border-stone-200 bg-white p-3 shadow-sm transition hover:border-stone-300 hover:shadow sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {recipe.image.url === null ? null : (
                    <div className="h-36 overflow-hidden rounded-md border border-stone-200 bg-stone-100 sm:h-28 sm:w-32 sm:shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={recipe.image.url} alt={recipe.image.altText ?? recipe.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight text-stone-900">{recipe.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{recipe.description ?? 'No description yet.'}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:max-w-xs">
                      <div className="rounded-md bg-stone-50 px-3 py-2">
                        <p className="text-xs font-medium text-stone-500">Complexity</p>
                        <p className="mt-1 font-semibold text-stone-900">{formatComplexity(recipe.classification.complexity)}</p>
                      </div>
                      <div className="rounded-md bg-stone-50 px-3 py-2">
                        <p className="text-xs font-medium text-stone-500">Rating</p>
                        <p className="mt-1 font-semibold text-stone-900">
                          {recipe.personal.rating === null ? 'None' : `${recipe.personal.rating}/5`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.classification.dishType.map((dishType) => (
                        <span key={dishType} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700">
                          {dishType}
                        </span>
                      ))}
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                      <span>
                        Main ingredients:{' '}
                        <strong className="font-medium text-stone-700">
                          {recipe.classification.mainIngredients.slice(0, 3).join(', ') || 'None listed'}
                        </strong>
                      </span>
                      <span>
                        Last cooked:{' '}
                        <strong className="font-medium text-stone-700">
                          {lastCookedDate === null ? 'Never' : formatDate(lastCookedDate)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <LocalStatusPanel recipes={recipes} />
    </section>
  );
}
