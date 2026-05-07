import { createEmptyRecipe } from '@/lib/recipe/defaults';
import {
  recipeClassificationSchema,
  recipeIngredientSchema,
  recipeMarkdownSchema,
  recipeServingsSchema,
  recipeStatusTagSchema,
  recipeStepSchema,
  recipeTimesSchema,
  type Recipe,
  type RecipeSourceMetadata,
} from '@/lib/recipe/schema';
import { z } from 'zod';

const compactIngredientSchema = z.union([
  z.string().trim().min(1),
  recipeIngredientSchema.partial({ group: true, quantity: true, unit: true, note: true, originalText: true }),
]);

const compactStepSchema = z.union([
  z.string().trim().min(1),
  recipeStepSchema.partial({ section: true, title: true, durationMinutes: true }),
]);

function optionalArraySchema<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === null ? undefined : value), z.array(schema).optional());
}

export const compactRecipeDraftSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  servingsText: z.string().trim().nullable().optional(),
  timeText: z.string().trim().nullable().optional(),
  servings: recipeServingsSchema.partial().optional(),
  times: recipeTimesSchema.partial().optional(),
  ingredients: z.array(compactIngredientSchema),
  steps: z.array(compactStepSchema),
  notes: optionalArraySchema(z.string().trim().min(1)),
  tags: optionalArraySchema(z.string().trim().min(1)),
  classification: recipeClassificationSchema.partial().optional(),
  personalStatusTags: optionalArraySchema(recipeStatusTagSchema),
  markdown: recipeMarkdownSchema.partial().optional(),
});

export type CompactRecipeDraft = z.infer<typeof compactRecipeDraftSchema>;

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug.length > 0 ? slug : 'recipe';
}

export function compactDraftToRecipe(draft: CompactRecipeDraft, source: Partial<RecipeSourceMetadata> | undefined): Recipe {
  const recipe = createEmptyRecipe();
  const now = new Date().toISOString();
  const notes = [...(draft.notes ?? [])];

  if (draft.servingsText !== undefined && draft.servingsText !== null) {
    notes.push(`Servings from source: ${draft.servingsText}`);
  }

  if (draft.timeText !== undefined && draft.timeText !== null) {
    notes.push(`Timing from source: ${draft.timeText}`);
  }

  return {
    ...recipe,
    id: `${slugify(draft.title)}-draft`,
    title: draft.title,
    description: draft.description ?? null,
    source: {
      ...recipe.source,
      ...source,
    },
    servings: {
      ...recipe.servings,
      ...draft.servings,
    },
    times: {
      ...recipe.times,
      ...draft.times,
    },
    ingredients: draft.ingredients.map((ingredient) =>
      typeof ingredient === 'string'
        ? {
            group: null,
            quantity: null,
            unit: null,
            item: ingredient,
            note: null,
            originalText: ingredient,
          }
        : {
            group: ingredient.group ?? null,
            quantity: ingredient.quantity ?? null,
            unit: ingredient.unit ?? null,
            item: ingredient.item,
            note: ingredient.note ?? null,
            originalText: ingredient.originalText ?? ingredient.item,
          },
    ),
    steps: draft.steps.map((step) =>
      typeof step === 'string'
        ? {
            section: null,
            title: null,
            text: step,
            durationMinutes: null,
          }
        : {
            section: step.section ?? null,
            title: step.title ?? null,
            text: step.text,
            durationMinutes: step.durationMinutes ?? null,
          },
    ),
    notes,
    classification: {
      ...recipe.classification,
      ...draft.classification,
      tags: draft.classification?.tags ?? draft.tags ?? recipe.classification.tags,
    },
    personal: {
      ...recipe.personal,
      statusTags: draft.personalStatusTags ?? [],
    },
    markdown: {
      ...recipe.markdown,
      ...draft.markdown,
    },
    createdAt: now,
    updatedAt: now,
  };
}
