'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { deleteRecipe, getRecipe } from '@/lib/db/repositories';
import { seedDevelopmentRecipes } from '@/lib/db/seed';
import {
  formatComplexity,
  formatDate,
  formatIngredient,
  formatMinutes,
  formatServings,
  getLastCookedDate,
  getRecipeTags,
  groupIngredients,
  groupSteps,
} from '@/lib/recipe/display';
import { getRecipeMarkdownSections } from '@/lib/recipe/markdownSections';
import type { Recipe, RecipeIngredient } from '@/lib/recipe/schema';

interface RecipeDetailProps {
  id: string;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-stone-50 px-3 py-2">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function SourceInfo({ recipe }: { recipe: Recipe }) {
  const source = recipe.source;
  const pieces = [
    source.type,
    source.name,
    source.author === null ? null : `by ${source.author}`,
    source.accessedAt === null ? null : `accessed ${formatDate(source.accessedAt)}`,
  ].filter(Boolean);

  if (pieces.length === 0 && source.url === null) {
    return <p className="text-sm leading-6 text-stone-600">No source recorded.</p>;
  }

  return (
    <p className="break-words text-sm leading-6 text-stone-600">
      {pieces.join(' · ')}
      {source.url === null ? null : (
        <>
          {pieces.length === 0 ? null : ' · '}
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-emerald-800 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-950"
          >
            {source.url}
          </a>
        </>
      )}
    </p>
  );
}

function parseQuantityPart(value: string): number | null {
  const trimmedValue = value.trim().replace(',', '.');
  const mixedMatch = trimmedValue.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);

  if (mixedMatch !== null) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);

    return denominator === 0 ? null : whole + numerator / denominator;
  }

  const fractionMatch = trimmedValue.match(/^(\d+)\s*\/\s*(\d+)$/);

  if (fractionMatch !== null) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    return denominator === 0 ? null : numerator / denominator;
  }

  const numericValue = Number(trimmedValue);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatScaledNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
}

function scaleQuantity(quantity: string | null, scaleFactor: number): string | null {
  if (quantity === null || scaleFactor === 1) {
    return quantity;
  }

  const rangeParts = quantity.split('-').map((part) => part.trim());

  if (rangeParts.length === 2) {
    const parsedRange = rangeParts.map(parseQuantityPart);

    if (parsedRange.every((value): value is number => value !== null)) {
      return parsedRange.map((value) => formatScaledNumber(value * scaleFactor)).join('-');
    }
  }

  const parsedQuantity = parseQuantityPart(quantity);

  return parsedQuantity === null ? quantity : formatScaledNumber(parsedQuantity * scaleFactor);
}

function scaleIngredient(ingredient: RecipeIngredient, scaleFactor: number): RecipeIngredient {
  return {
    ...ingredient,
    quantity: scaleQuantity(ingredient.quantity, scaleFactor),
  };
}

function formatScaledServings(recipe: Recipe, scaleFactor: number): string {
  const { note, quantity, unit } = recipe.servings;
  const scaledQuantity = quantity === null ? null : formatScaledNumber(quantity * scaleFactor);
  const servingsText = [scaledQuantity, unit].filter(Boolean).join(' ');

  return [servingsText || 'Not set', note].filter(Boolean).join(', ');
}

export function RecipeDetail({ id }: RecipeDetailProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      try {
        setIsLoading(true);
        await seedDevelopmentRecipes();
        const storedRecipe = await getRecipe(id);

        if (isMounted) {
          setRecipe(storedRecipe ?? null);
        }
      } catch {
        if (isMounted) {
          setError('Recipe could not be loaded from local storage.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">Loading recipe...</div>;
  }

  if (error !== null) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>;
  }

  if (recipe === null) {
    return (
      <section className="rounded-md border border-stone-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Recipe not found</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">This recipe is not in local browser storage.</p>
        <Link href="/recipes" className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
          Back to recipes
        </Link>
      </section>
    );
  }

  const ingredientGroups = groupIngredients(recipe.ingredients.map((ingredient) => scaleIngredient(ingredient, scaleFactor)));
  const stepGroups = groupSteps(recipe.steps);
  const tags = getRecipeTags(recipe);
  const lastCookedDate = getLastCookedDate(recipe);
  const markdownSections = getRecipeMarkdownSections(recipe);

  async function handleDelete(recipeToDelete: Recipe) {
    if (!window.confirm(`Delete "${recipeToDelete.title}" from local recipe storage?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteRecipe(recipeToDelete.id);
      router.push('/recipes');
    } catch {
      setError('Recipe could not be deleted from local storage.');
      setIsDeleting(false);
    }
  }

  return (
    <article className="space-y-5">
      <header className="rounded-md border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">{recipe.title}</h1>
              <p className="mt-4 text-base leading-7 text-stone-700">{recipe.description ?? 'No description yet.'}</p>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-stone-500">Source</p>
                <SourceInfo recipe={recipe} />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800 transition hover:border-stone-400"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => void handleDelete(recipe)}
                disabled={isDeleting}
                className="inline-flex h-11 items-center justify-center rounded-md border border-red-200 px-4 text-sm font-semibold text-red-800 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <Link
                href={`/recipes/${recipe.id}/print`}
                target="_blank"
                className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Reading mode
              </Link>
            </div>
          </div>
          {recipe.image.url === null ? null : (
            <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={recipe.image.url} alt={recipe.image.altText ?? recipe.title} className="aspect-[4/3] w-full object-cover" />
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Servings" value={formatServings(recipe)} />
          <DetailField label="Total time" value={formatMinutes(recipe.times.totalMinutes)} />
          <DetailField label="Complexity" value={formatComplexity(recipe.classification.complexity)} />
          <DetailField label="Rating" value={recipe.personal.rating === null ? 'Not rated' : `${recipe.personal.rating}/5`} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900">
              {tag}
            </span>
          ))}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-stone-900">Ingredients</h2>
              <p className="mt-1 text-sm text-stone-600">Scaled servings: {formatScaledServings(recipe, scaleFactor)}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-semibold uppercase text-stone-500">Scale doses</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[0.5, 1, 1.5, 2, 3].map((factor) => (
                  <button
                    key={factor}
                    type="button"
                    onClick={() => setScaleFactor(factor)}
                    className={`h-9 rounded-md px-3 text-sm font-semibold transition ${
                      scaleFactor === factor ? 'bg-brand text-white' : 'border border-stone-300 bg-white text-stone-800 hover:border-stone-400'
                    }`}
                  >
                    {factor}x
                  </button>
                ))}
              </div>
              <label className="mt-3 grid gap-1 text-sm font-medium text-stone-700">
                <span>Custom multiplier</span>
                <input
                  type="number"
                  min="0.25"
                  max="10"
                  step="0.25"
                  value={scaleFactor}
                  onChange={(event) => {
                    const nextFactor = Number(event.target.value);

                    if (Number.isFinite(nextFactor) && nextFactor > 0) {
                      setScaleFactor(nextFactor);
                    }
                  }}
                  className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                />
              </label>
            </div>
          </div>
          {ingredientGroups.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No ingredients recorded.</p>
          ) : (
            <div className="mt-4 space-y-5">
              {ingredientGroups.map((group) => (
                <section key={group.title}>
                  <h3 className="text-sm font-semibold uppercase text-stone-500">{group.title}</h3>
                  <ul className="mt-2 space-y-2 text-base leading-7 text-stone-800">
                    {group.items.map((ingredient, index) => (
                      <li key={`${group.title}-${ingredient.item}-${index}`}>{formatIngredient(ingredient)}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-900">Steps</h2>
          {stepGroups.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No method recorded.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {stepGroups.map((group) => (
                <section key={group.title}>
                  <h3 className="text-sm font-semibold uppercase text-stone-500">{group.title}</h3>
                  <ol className="mt-3 space-y-4">
                    {group.items.map((step, index) => (
                      <li key={`${group.title}-${step.text}-${index}`} className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-sm font-semibold text-amber-950">
                          {index + 1}
                        </span>
                        <div>
                          {step.title === null ? null : <p className="font-semibold text-stone-900">{step.title}</p>}
                          <p className="text-base leading-7 text-stone-800">{step.text}</p>
                          {step.durationMinutes === null ? null : (
                            <p className="mt-1 text-xs font-medium text-stone-500">{formatMinutes(step.durationMinutes)}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      {markdownSections.length === 0 ? null : (
        <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-900">Original text</h2>
          <div className="mt-4 space-y-5">
            {markdownSections.map((section) => (
              <section key={section.title}>
                <h3 className="text-sm font-semibold uppercase text-stone-500">{section.title}</h3>
                <div className="mt-2 whitespace-pre-wrap rounded-md bg-stone-50 p-4 font-sans text-sm leading-6 text-stone-800">
                  {section.text}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Notes</h2>
          {recipe.notes.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No notes yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
              {recipe.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Comments</h2>
          {recipe.personal.comments.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No comments yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
              {recipe.personal.comments.map((comment) => (
                <li key={comment}>{comment}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Cooked Sessions</h2>
          {recipe.personal.cookedSessions.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">Never cooked.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm leading-6 text-stone-700">
              {recipe.personal.cookedSessions.map((session) => (
                <li key={`${session.date}-${session.notes ?? ''}`}>
                  <p className="font-semibold text-stone-900">
                    {formatDate(session.date)}
                    {session.rating === null ? '' : ` · ${session.rating}/5`}
                  </p>
                  {session.notes === null ? null : <p>{session.notes}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-stone-500">
            Last cooked: {lastCookedDate === null ? 'Never' : formatDate(lastCookedDate)}
          </p>
        </div>
      </section>
    </article>
  );
}
