import { z } from 'zod';

const nullableTextSchema = z.string().trim().nullable();
const nonNegativeMinutesSchema = z.number().int().min(0).nullable();
const isoDateTimeSchema = z.string().datetime();

export const recipeStatusTagValues = [
  'to try',
  'standard rotation',
  'quick overnight',
  'kid-friendly',
  'good for crowd',
] as const;

export const recipeComplexityValues = ['easy', 'medium', 'hard'] as const;

export const recipeStatusTagSchema = z.enum(recipeStatusTagValues);
export const recipeComplexitySchema = z.enum(recipeComplexityValues);

export const recipeImageMetadataSchema = z
  .object({
    url: nullableTextSchema,
    storageKey: nullableTextSchema,
    altText: nullableTextSchema,
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    mimeType: nullableTextSchema,
  })
  .strict();

export const recipeSourceMetadataSchema = z
  .object({
    type: z.enum(['manual', 'pasted-text', 'image', 'url', 'import']),
    name: nullableTextSchema,
    url: z.string().url().nullable(),
    author: nullableTextSchema,
    publishedAt: isoDateTimeSchema.nullable(),
    accessedAt: isoDateTimeSchema.nullable(),
  })
  .strict();

export const recipeServingsSchema = z
  .object({
    quantity: z.number().positive().nullable(),
    unit: nullableTextSchema,
    note: nullableTextSchema,
  })
  .strict();

export const recipeTimesSchema = z
  .object({
    prepMinutes: nonNegativeMinutesSchema,
    cookMinutes: nonNegativeMinutesSchema,
    restMinutes: nonNegativeMinutesSchema,
    totalMinutes: nonNegativeMinutesSchema,
  })
  .strict();

export const recipeIngredientSchema = z
  .object({
    group: nullableTextSchema,
    quantity: nullableTextSchema,
    unit: nullableTextSchema,
    item: z.string().trim().min(1),
    note: nullableTextSchema,
    originalText: nullableTextSchema,
  })
  .strict();

export const recipeStepSchema = z
  .object({
    section: nullableTextSchema,
    title: nullableTextSchema,
    text: z.string().trim().min(1),
    durationMinutes: nonNegativeMinutesSchema,
  })
  .strict();

export const recipeClassificationSchema = z
  .object({
    dishType: z.array(z.string().trim().min(1)),
    complexity: recipeComplexitySchema.nullable(),
    mainIngredients: z.array(z.string().trim().min(1)),
    season: z.array(z.string().trim().min(1)),
    dietary: z.array(z.string().trim().min(1)),
    tags: z.array(z.string().trim().min(1)),
    cuisine: z.array(z.string().trim().min(1)),
  })
  .strict();

export const cookedSessionSchema = z
  .object({
    date: isoDateTimeSchema,
    notes: nullableTextSchema,
    rating: z.number().int().min(1).max(5).nullable(),
  })
  .strict();

export const recipePersonalSchema = z
  .object({
    rating: z.number().int().min(1).max(5).nullable(),
    comments: z.array(z.string().trim().min(1)),
    cookedSessions: z.array(cookedSessionSchema),
    statusTags: z.array(recipeStatusTagSchema),
  })
  .strict();

export const recipeMarkdownSchema = z
  .object({
    intro: nullableTextSchema,
    methodNotes: nullableTextSchema,
    variations: nullableTextSchema,
  })
  .strict();

export const recipeSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: nullableTextSchema,
    image: recipeImageMetadataSchema,
    source: recipeSourceMetadataSchema,
    servings: recipeServingsSchema,
    times: recipeTimesSchema,
    ingredients: z.array(recipeIngredientSchema),
    steps: z.array(recipeStepSchema),
    notes: z.array(z.string().trim().min(1)),
    classification: recipeClassificationSchema,
    personal: recipePersonalSchema,
    markdown: recipeMarkdownSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeStatusTag = z.infer<typeof recipeStatusTagSchema>;
export type RecipeComplexity = z.infer<typeof recipeComplexitySchema>;
export type RecipeImageMetadata = z.infer<typeof recipeImageMetadataSchema>;
export type RecipeSourceMetadata = z.infer<typeof recipeSourceMetadataSchema>;
export type RecipeServings = z.infer<typeof recipeServingsSchema>;
export type RecipeTimes = z.infer<typeof recipeTimesSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeStep = z.infer<typeof recipeStepSchema>;
export type RecipeClassification = z.infer<typeof recipeClassificationSchema>;
export type CookedSession = z.infer<typeof cookedSessionSchema>;
export type RecipePersonal = z.infer<typeof recipePersonalSchema>;
export type RecipeMarkdown = z.infer<typeof recipeMarkdownSchema>;

export function validateRecipe(input: unknown): Recipe {
  return recipeSchema.parse(input);
}
