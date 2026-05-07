'use client';

import { useEffect, useState } from 'react';

import { getRecipe } from '@/lib/db/repositories';
import { seedDevelopmentRecipes } from '@/lib/db/seed';
import {
  formatComplexity,
  formatIngredient,
  formatMinutes,
  formatServings,
  getRecipeTags,
  groupIngredients,
  groupSteps,
} from '@/lib/recipe/display';
import type { Recipe } from '@/lib/recipe/schema';

interface RecipePrintViewProps {
  id: string;
}

function sectionId(title: string): string {
  return `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function RecipePrintView({ id }: RecipePrintViewProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return <main className="mx-auto max-w-3xl bg-white p-8 text-lg text-stone-700">Loading recipe...</main>;
  }

  if (error !== null || recipe === null) {
    return (
      <main className="mx-auto max-w-3xl bg-white p-8 text-lg text-stone-700">
        {error ?? 'This recipe is not in local browser storage.'}
      </main>
    );
  }

  const ingredientGroups = groupIngredients(recipe.ingredients);
  const stepGroups = groupSteps(recipe.steps);
  const tags = getRecipeTags(recipe);
  const showStepIndex = stepGroups.length > 1 || recipe.steps.length >= 6;

  return (
    <article className="mx-auto max-w-4xl bg-white px-5 py-8 text-stone-950 sm:px-10 print:max-w-none print:px-0 print:py-0">
      <header className="border-b border-stone-300 pb-6">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">{recipe.title}</h1>
        {recipe.description === null ? null : <p className="mt-4 max-w-3xl text-xl leading-8 text-stone-700">{recipe.description}</p>}
        <div className="mt-5 grid gap-2 text-base sm:grid-cols-4">
          <p>
            <span className="font-semibold">Servings:</span> {formatServings(recipe)}
          </p>
          <p>
            <span className="font-semibold">Total:</span> {formatMinutes(recipe.times.totalMinutes)}
          </p>
          <p>
            <span className="font-semibold">Prep:</span> {formatMinutes(recipe.times.prepMinutes)}
          </p>
          <p>
            <span className="font-semibold">Cook:</span> {formatMinutes(recipe.times.cookMinutes)}
          </p>
        </div>
        <p className="mt-2 text-base">
          <span className="font-semibold">Complexity:</span> {formatComplexity(recipe.classification.complexity)}
        </p>
        {tags.length === 0 ? null : <p className="mt-3 text-sm leading-6 text-stone-600">{tags.join(' · ')}</p>}
      </header>

      {showStepIndex ? (
        <nav className="mt-6 border-b border-stone-200 pb-5 print:hidden" aria-label="Step index">
          <h2 className="text-lg font-semibold">Step index</h2>
          <ol className="mt-2 grid gap-2 text-base sm:grid-cols-2">
            {stepGroups.map((group) => (
              <li key={group.title}>
                <a className="underline underline-offset-4" href={`#${sectionId(group.title)}`}>
                  {group.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <section>
          <h2 className="text-3xl font-semibold">Ingredients</h2>
          {ingredientGroups.length === 0 ? (
            <p className="mt-4 text-lg leading-8 text-stone-700">No ingredients recorded.</p>
          ) : (
            <div className="mt-5 space-y-7">
              {ingredientGroups.map((group) => (
                <section key={group.title}>
                  <h3 className="text-lg font-semibold uppercase text-stone-600">{group.title}</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-lg leading-8">
                    {group.items.map((ingredient, index) => (
                      <li key={`${group.title}-${ingredient.item}-${index}`}>{formatIngredient(ingredient)}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-semibold">Method</h2>
          {stepGroups.length === 0 ? (
            <p className="mt-4 text-lg leading-8 text-stone-700">No method recorded.</p>
          ) : (
            <div className="mt-5 space-y-9">
              {stepGroups.map((group) => (
                <section key={group.title} id={sectionId(group.title)} className="scroll-mt-6">
                  <h3 className="text-xl font-semibold uppercase text-stone-600">{group.title}</h3>
                  <ol className="mt-3 space-y-5 text-xl leading-9">
                    {group.items.map((step, index) => (
                      <li key={`${group.title}-${step.text}-${index}`} className="break-inside-avoid">
                        <span className="font-semibold">{index + 1}. </span>
                        {step.title === null ? null : <span className="font-semibold">{step.title}: </span>}
                        {step.text}
                        {step.durationMinutes === null ? null : (
                          <span className="text-base text-stone-500"> ({formatMinutes(step.durationMinutes)})</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>

      {recipe.notes.length === 0 ? null : (
        <section className="mt-10 border-t border-stone-200 pt-6">
          <h2 className="text-3xl font-semibold">Notes</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-lg leading-8">
            {recipe.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
