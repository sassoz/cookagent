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

interface FilterState {
  complexity: '' | RecipeComplexity;
  dishType: string;
  mainIngredient: string;
  query: string;
  season: string;
  statusTag: '' | RecipeStatusTag;
  tag: string;
}

type SortMode = 'random' | 'createdAt' | 'lastCooked' | 'timesCooked';
type SortDirection = 'asc' | 'desc';

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

function compareNullableDates(first: string | null, second: string | null): number {
  if (first === null && second === null) {
    return 0;
  }

  if (first === null) {
    return -1;
  }

  if (second === null) {
    return 1;
  }

  return new Date(first).getTime() - new Date(second).getTime();
}

function getDailyRecipe(recipes: Recipe[]): Recipe | null {
  if (recipes.length === 0) {
    return null;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const seed = Array.from(todayKey).reduce((total, character) => total + character.charCodeAt(0), 0);

  return recipes[seed % recipes.length];
}

function randomScore(recipe: Recipe, seed: number): number {
  const text = `${recipe.id}:${seed}`;
  let hash = 2166136261;

  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function sortRecipes(recipes: Recipe[], sortMode: SortMode, sortDirection: SortDirection, randomSeed: number): Recipe[] {
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

  return [...recipes].sort((first, second) => {
    let result: number;

    if (sortMode === 'random') {
      result = randomScore(first, randomSeed) - randomScore(second, randomSeed);
    } else if (sortMode === 'createdAt') {
      result = new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
    } else if (sortMode === 'lastCooked') {
      result = compareNullableDates(getLastCookedDate(first), getLastCookedDate(second));
    } else {
      result = first.personal.cookedSessions.length - second.personal.cookedSessions.length;
    }

    if (result === 0) {
      result = first.title.localeCompare(second.title);
    }

    return result * directionMultiplier;
  });
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

function RecipeOfTheDay({ recipe }: { recipe: Recipe | null }) {
  return (
    <section className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {recipe?.image.url === undefined || recipe.image.url === null ? (
          <div className="grid min-h-56 place-items-center bg-stone-100 px-6 text-sm text-stone-500">No image</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.image.url} alt={recipe.image.altText ?? recipe.title} className="h-full min-h-56 w-full object-cover" />
        )}
        <div className="flex min-h-56 flex-col justify-between gap-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Recipe of the day</p>
            {recipe === null ? (
              <>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">No recipes yet</h1>
                <p className="mt-3 text-sm leading-6 text-stone-600">Add a recipe to start building your local rotation.</p>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{recipe.title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
                  {recipe.description ?? 'Open the recipe for ingredients, steps, and print view.'}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {recipe === null ? null : (
              <Link href={`/recipes/${recipe.id}`} className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white">
                Open recipe
              </Link>
            )}
            <Link href="/ingest" className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800">
              Ingest recipe
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function LocalStatusPanel({ recipes }: { recipes: Recipe[] }) {
  const cookedRecipes = recipes.filter((recipe) => recipe.personal.cookedSessions.length > 0).length;

  return (
    <section className="grid gap-3 sm:grid-cols-2">
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
    </section>
  );
}

export function RecipeDashboard() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [visibleRecipes, setVisibleRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('random');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000));

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
  const todayRecipe = getDailyRecipe(recipes);
  const sortedRecipes = useMemo(
    () => sortRecipes(visibleRecipes, sortMode, sortDirection, randomSeed),
    [randomSeed, sortDirection, sortMode, visibleRecipes],
  );

  return (
    <section className="space-y-6">
      <RecipeOfTheDay recipe={todayRecipe} />

      <div className="space-y-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-stone-700 sm:col-span-2 lg:col-span-4">
          <span>Search recipes</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Title, description, tags, ingredients..."
            className="h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-stone-700">
          <span>Sort by</span>
          <select
            value={sortMode}
            onChange={(event) => {
              const nextSortMode = event.target.value as SortMode;
              setSortMode(nextSortMode);

              if (nextSortMode === 'random') {
                setRandomSeed(Math.floor(Math.random() * 1_000_000_000));
              }
            }}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          >
            <option value="random">Random</option>
            <option value="createdAt">Insert date</option>
            <option value="lastCooked">Last cooked</option>
            <option value="timesCooked">Times cooked</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-700">
          <span>Order</span>
          <select
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as SortDirection)}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
        {sortMode === 'random' ? (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setRandomSeed(Math.floor(Math.random() * 1_000_000_000))}
              className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800 transition hover:border-stone-400"
            >
              Shuffle
            </button>
          </div>
        ) : null}
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

        <details className="rounded-md border border-stone-200 bg-stone-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-stone-800">
            Filters{hasActiveFilters ? ' active' : ''}
          </summary>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </details>
      </div>

      {error === null ? null : (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {isLoading ? (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">Loading recipes...</div>
      ) : sortedRecipes.length === 0 ? (
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
          {sortedRecipes.map((recipe) => {
            const lastCookedDate = getLastCookedDate(recipe);
            const tags = Array.from(new Set([...recipe.classification.tags, ...recipe.personal.statusTags])).slice(0, 4);

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
                      <span>
                        Cooked:{' '}
                        <strong className="font-medium text-stone-700">{recipe.personal.cookedSessions.length}</strong>
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
