'use client';

import { RecipeEditor } from '@/components/recipe-editor';
import type { Recipe } from '@/lib/recipe/schema';

interface ReviewDraftProps {
  recipe: Recipe;
}

export function ReviewDraft({ recipe }: ReviewDraftProps) {
  return (
    <section className="space-y-3">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-lg font-semibold text-emerald-950">Review extracted draft</h2>
        <p className="mt-1 text-sm leading-6 text-emerald-900">
          Edit anything that looks wrong, then save. The recipe is not stored until you click Save Recipe.
        </p>
      </div>
      <RecipeEditor
        initialRecipe={recipe}
        eyebrow="Review"
        heading="Review recipe draft"
        cancelHref="/ingest"
      />
    </section>
  );
}
