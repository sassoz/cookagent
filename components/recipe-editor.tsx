'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ZodError } from 'zod';

import { getRecipe, listRecipes, saveRecipe } from '@/lib/db/repositories';
import { imageFileFromClipboard } from '@/lib/browser/clipboardImage';
import { seedDevelopmentRecipes } from '@/lib/db/seed';
import { createEmptyRecipe } from '@/lib/recipe/defaults';
import { computeTotalTime } from '@/lib/recipe/normalize';
import {
  recipeComplexityValues,
  recipeSchema,
  recipeStatusTagValues,
  type CookedSession,
  type Recipe,
  type RecipeComplexity,
  type RecipeIngredient,
  type RecipeStep,
} from '@/lib/recipe/schema';

interface RecipeEditorProps {
  id?: string;
  initialRecipe?: Recipe;
  eyebrow?: string;
  heading?: string;
  cancelHref?: string;
}

type StringField = 'dishType' | 'mainIngredients' | 'season' | 'dietary' | 'tags' | 'cuisine';

const sourceTypeValues = ['manual', 'pasted-text', 'image', 'url', 'import', 'book'] as const;

function nullableText(value: string): string | null {
  return value.length === 0 ? null : value;
}

function nullableNumber(value: string): number | null {
  return value.trim().length === 0 ? null : Number(value);
}

function numberInputValue(value: number | null): string {
  return value === null ? '' : value.toString();
}

function dateInputValue(value: string): string {
  return value.slice(0, 10);
}

function isoFromDateInput(value: string): string {
  if (value.length === 0) {
    return new Date().toISOString();
  }

  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function nullableIsoFromDateInput(value: string): string | null {
  return value.length === 0 ? null : new Date(`${value}T12:00:00.000Z`).toISOString();
}

function parseList(value: string): string[] {
  return value.length === 0 ? [] : value.split(',');
}

function formatList(value: string[]): string {
  return value.join(', ');
}

function validationMessages(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? 'recipe' : issue.path.join('.');

    return `${path}: ${issue.message}`;
  });
}

function cleanedTextArray(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function cleanRecipeForSave(recipe: Recipe): Recipe {
  return {
    ...recipe,
    notes: cleanedTextArray(recipe.notes),
    classification: {
      ...recipe.classification,
      dishType: cleanedTextArray(recipe.classification.dishType),
      mainIngredients: cleanedTextArray(recipe.classification.mainIngredients),
      season: cleanedTextArray(recipe.classification.season),
      dietary: cleanedTextArray(recipe.classification.dietary),
      tags: cleanedTextArray(recipe.classification.tags),
      cuisine: cleanedTextArray(recipe.classification.cuisine),
    },
    personal: {
      ...recipe.personal,
      comments: cleanedTextArray(recipe.personal.comments),
    },
  };
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';
const textareaClass =
  'min-h-28 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';

function emptyIngredient(): RecipeIngredient {
  return {
    group: null,
    quantity: null,
    unit: null,
    item: '',
    note: null,
    originalText: null,
  };
}

function emptyStep(): RecipeStep {
  return {
    section: null,
    title: null,
    text: '',
    durationMinutes: null,
  };
}

function emptyCookedSession(): CookedSession {
  return {
    date: new Date().toISOString(),
    notes: null,
    rating: null,
  };
}

async function readRecipeImage(file: File): Promise<{ dataUrl: string; height: number | null; width: number | null }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.readAsDataURL(file);
  });

  const dimensions = await new Promise<{ height: number | null; width: number | null }>((resolve) => {
    const image = new window.Image();

    image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
    image.onerror = () => resolve({ height: null, width: null });
    image.src = dataUrl;
  });

  return { dataUrl, ...dimensions };
}

export function RecipeEditor({ cancelHref, eyebrow, heading, id, initialRecipe }: RecipeEditorProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe>(() => initialRecipe ?? createEmptyRecipe());
  const [customTagInput, setCustomTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(id !== undefined && initialRecipe === undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [bookSuggestions, setBookSuggestions] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      if (id === undefined || initialRecipe !== undefined) {
        return;
      }

      try {
        setIsLoading(true);
        await seedDevelopmentRecipes();
        const storedRecipe = await getRecipe(id);

        if (!isMounted) {
          return;
        }

        if (storedRecipe === undefined) {
          setLoadError('This recipe is not in local browser storage.');
        } else {
          setRecipe(storedRecipe);
        }
      } catch {
        if (isMounted) {
          setLoadError('Recipe could not be loaded from local storage.');
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
  }, [id, initialRecipe]);

  useEffect(() => {
    let isMounted = true;

    async function loadBookSuggestions() {
      try {
        await seedDevelopmentRecipes();
        const recipes = await listRecipes();
        const books = Array.from(
          new Set(
            recipes
              .filter((storedRecipe) => storedRecipe.source.type === 'book' && storedRecipe.source.name !== null)
              .map((storedRecipe) => storedRecipe.source.name?.trim() ?? '')
              .filter((name) => name.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b));

        if (isMounted) {
          setBookSuggestions(books);
        }
      } catch {
        if (isMounted) {
          setBookSuggestions([]);
        }
      }
    }

    void loadBookSuggestions();

    return () => {
      isMounted = false;
    };
  }, []);

  function setRecipeValue(update: (current: Recipe) => Recipe) {
    setRecipe((current) => update(current));
    setValidationErrors([]);
  }

  function updateIngredient(index: number, update: Partial<RecipeIngredient>) {
    setRecipeValue((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, ...update } : ingredient,
      ),
    }));
  }

  function updateStep(index: number, update: Partial<RecipeStep>) {
    setRecipeValue((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? { ...step, ...update } : step)),
    }));
  }

  function updateCookedSession(index: number, update: Partial<CookedSession>) {
    setRecipeValue((current) => ({
      ...current,
      personal: {
        ...current.personal,
        cookedSessions: current.personal.cookedSessions.map((session, sessionIndex) =>
          sessionIndex === index ? { ...session, ...update } : session,
        ),
      },
    }));
  }

  function updateClassificationList(field: StringField, value: string) {
    setRecipeValue((current) => ({
      ...current,
      classification: {
        ...current.classification,
        [field]: parseList(value),
      },
    }));
  }

  function addCustomTag() {
    const nextTag = customTagInput.trim();

    if (nextTag.length === 0) {
      return;
    }

    setRecipeValue((current) => {
      if (current.classification.tags.some((tag) => tag.toLocaleLowerCase() === nextTag.toLocaleLowerCase())) {
        return current;
      }

      return {
        ...current,
        classification: {
          ...current.classification,
          tags: [...current.classification.tags, nextTag],
        },
      };
    });
    setCustomTagInput('');
  }

  function removeCustomTag(tagToRemove: string) {
    setRecipeValue((current) => ({
      ...current,
      classification: {
        ...current.classification,
        tags: current.classification.tags.filter((tag) => tag !== tagToRemove),
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setValidationErrors([]);

    const candidate: Recipe = {
      ...cleanRecipeForSave(recipe),
      times: {
        ...recipe.times,
        totalMinutes: recipe.times.totalMinutes ?? computeTotalTime(recipe.times),
      },
    };
    const result = recipeSchema.safeParse(candidate);

    if (!result.success) {
      setValidationErrors(validationMessages(result.error));
      setIsSaving(false);
      return;
    }

    try {
      const savedId = await saveRecipe(result.data);
      router.push(`/recipes/${savedId}`);
    } catch (error) {
      setValidationErrors(error instanceof ZodError ? validationMessages(error) : ['Recipe could not be saved.']);
      setIsSaving(false);
    }
  }

  async function handleImageFile(file: File | undefined) {
    if (file === undefined) {
      return;
    }

    try {
      const image = await readRecipeImage(file);

      setRecipeValue((current) => ({
        ...current,
        image: {
          url: image.dataUrl,
          storageKey: null,
          altText: current.image.altText ?? current.title,
          width: image.width,
          height: image.height,
          mimeType: file.type || null,
        },
      }));
    } catch {
      setValidationErrors(['Recipe photo could not be read.']);
    }
  }

  function handleImagePaste(event: React.ClipboardEvent) {
    const file = imageFileFromClipboard(event);

    if (file === null) {
      return;
    }

    event.preventDefault();
    void handleImageFile(file);
  }

  if (isLoading) {
    return <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">Loading editor...</div>;
  }

  if (loadError !== null) {
    return (
      <section className="rounded-md border border-stone-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Recipe not found</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{loadError}</p>
        <Link href="/recipes" className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
          Back to recipes
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-800">
            {eyebrow ?? (id === undefined ? 'Create' : 'Edit')}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
            {heading ?? (id === undefined ? 'New recipe' : recipe.title)}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={cancelHref ?? (id === undefined ? '/recipes' : `/recipes/${recipe.id}`)}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save recipe'}
          </button>
        </div>
      </header>

      {validationErrors.length === 0 ? null : (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Fix these fields before saving:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Basics</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <input
              className={inputClass}
              value={recipe.title}
              onChange={(event) => setRecipeValue((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>
          <Field label="Servings quantity">
            <input
              className={inputClass}
              inputMode="decimal"
              value={numberInputValue(recipe.servings.quantity)}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  servings: { ...current.servings, quantity: nullableNumber(event.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Servings unit">
            <input
              className={inputClass}
              value={recipe.servings.unit ?? ''}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  servings: { ...current.servings, unit: nullableText(event.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Servings note">
            <input
              className={inputClass}
              value={recipe.servings.note ?? ''}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  servings: { ...current.servings, note: nullableText(event.target.value) },
                }))
              }
            />
          </Field>
          <label className="grid gap-1 text-sm font-medium text-stone-700 sm:col-span-2">
            <span>Description</span>
            <textarea
              className={textareaClass}
              value={recipe.description ?? ''}
              onChange={(event) => setRecipeValue((current) => ({ ...current, description: nullableText(event.target.value) }))}
            />
          </label>
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm" onPaste={handleImagePaste}>
        <h2 className="text-xl font-semibold text-stone-900">Recipe photo</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div
            tabIndex={0}
            className="flex min-h-56 items-center justify-center overflow-hidden rounded-md border border-stone-200 bg-stone-50 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          >
            {recipe.image.url === null ? (
              <p className="px-4 text-center text-sm text-stone-500">No recipe photo saved. You can paste an image here.</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.image.url} alt={recipe.image.altText ?? recipe.title} className="h-full max-h-72 w-full object-cover" />
            )}
          </div>
          <div className="space-y-3">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Add photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => void handleImageFile(event.target.files?.[0])}
                className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </label>
            <p className="text-sm leading-6 text-stone-600">You can also paste an image from the clipboard while this photo section is focused.</p>
            <Field label="Photo alt text">
              <input
                className={inputClass}
                value={recipe.image.altText ?? ''}
                onChange={(event) =>
                  setRecipeValue((current) => ({
                    ...current,
                    image: { ...current.image, altText: nullableText(event.target.value) },
                  }))
                }
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                setRecipeValue((current) => ({
                  ...current,
                  image: {
                    url: null,
                    storageKey: null,
                    altText: null,
                    width: null,
                    height: null,
                    mimeType: null,
                  },
                }))
              }
              disabled={recipe.image.url === null}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove photo
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Source</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Source type">
            <select
              className={inputClass}
              value={recipe.source.type}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  source: { ...current.source, type: event.target.value as Recipe['source']['type'] },
                }))
              }
            >
              {sourceTypeValues.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {sourceType}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source name">
            <input
              className={inputClass}
              type="text"
              list={recipe.source.type === 'book' ? 'recipe-source-book-suggestions' : undefined}
              autoComplete="off"
              value={recipe.source.name ?? ''}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  source: { ...current.source, name: nullableText(event.target.value) },
                }))
              }
            />
            <datalist id="recipe-source-book-suggestions">
              {bookSuggestions.map((book) => (
                <option key={book} value={book} />
              ))}
            </datalist>
          </Field>
          <Field label="Source URL">
            <input
              className={inputClass}
              type="url"
              value={recipe.source.url ?? ''}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  source: { ...current.source, url: nullableText(event.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Author">
            <input
              className={inputClass}
              value={recipe.source.author ?? ''}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  source: { ...current.source, author: nullableText(event.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Published date">
            <input
              className={inputClass}
              type="date"
              value={recipe.source.publishedAt === null ? '' : dateInputValue(recipe.source.publishedAt)}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  source: { ...current.source, publishedAt: nullableIsoFromDateInput(event.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Accessed date">
            <input
              className={inputClass}
              type="date"
              value={recipe.source.accessedAt === null ? '' : dateInputValue(recipe.source.accessedAt)}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  source: { ...current.source, accessedAt: nullableIsoFromDateInput(event.target.value) },
                }))
              }
            />
          </Field>
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Times</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {(['prepMinutes', 'cookMinutes', 'restMinutes', 'totalMinutes'] as const).map((field) => (
            <Field key={field} label={field.replace('Minutes', ' minutes')}>
              <input
                className={inputClass}
                inputMode="numeric"
                value={numberInputValue(recipe.times[field])}
                onChange={(event) =>
                  setRecipeValue((current) => ({
                    ...current,
                    times: { ...current.times, [field]: nullableNumber(event.target.value) },
                  }))
                }
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-900">Ingredients</h2>
          <button
            type="button"
            onClick={() => setRecipeValue((current) => ({ ...current, ingredients: [...current.ingredients, emptyIngredient()] }))}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800"
          >
            Add ingredient
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {recipe.ingredients.map((ingredient, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-stone-200 p-3 sm:grid-cols-6">
              <input className={inputClass} placeholder="Group" value={ingredient.group ?? ''} onChange={(event) => updateIngredient(index, { group: nullableText(event.target.value) })} />
              <input className={inputClass} placeholder="Qty" value={ingredient.quantity ?? ''} onChange={(event) => updateIngredient(index, { quantity: nullableText(event.target.value) })} />
              <input className={inputClass} placeholder="Unit" value={ingredient.unit ?? ''} onChange={(event) => updateIngredient(index, { unit: nullableText(event.target.value) })} />
              <input className={`${inputClass} sm:col-span-2`} placeholder="Item" value={ingredient.item} onChange={(event) => updateIngredient(index, { item: event.target.value })} />
              <button
                type="button"
                onClick={() => setRecipeValue((current) => ({ ...current, ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index) }))}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800"
              >
                Remove
              </button>
              <input className={`${inputClass} sm:col-span-6`} placeholder="Note" value={ingredient.note ?? ''} onChange={(event) => updateIngredient(index, { note: nullableText(event.target.value) })} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-900">Steps</h2>
          <button
            type="button"
            onClick={() => setRecipeValue((current) => ({ ...current, steps: [...current.steps, emptyStep()] }))}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800"
          >
            Add step
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {recipe.steps.map((step, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-stone-200 p-3 sm:grid-cols-[1fr_1fr_9rem_auto]">
              <input className={inputClass} placeholder="Section" value={step.section ?? ''} onChange={(event) => updateStep(index, { section: nullableText(event.target.value) })} />
              <input className={inputClass} placeholder="Title" value={step.title ?? ''} onChange={(event) => updateStep(index, { title: nullableText(event.target.value) })} />
              <input className={inputClass} placeholder="Minutes" inputMode="numeric" value={numberInputValue(step.durationMinutes)} onChange={(event) => updateStep(index, { durationMinutes: nullableNumber(event.target.value) })} />
              <button
                type="button"
                onClick={() => setRecipeValue((current) => ({ ...current, steps: current.steps.filter((_, itemIndex) => itemIndex !== index) }))}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800"
              >
                Remove
              </button>
              <textarea className={`${textareaClass} sm:col-span-4`} placeholder="Step text" value={step.text} onChange={(event) => updateStep(index, { text: event.target.value })} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Markdown notes</h2>
        <div className="mt-4 grid gap-3">
          {(['intro', 'methodNotes', 'variations'] as const).map((field) => (
            <Field key={field} label={field}>
              <textarea
                className={textareaClass}
                value={recipe.markdown[field] ?? ''}
                onChange={(event) =>
                  setRecipeValue((current) => ({
                    ...current,
                    markdown: { ...current.markdown, [field]: nullableText(event.target.value) },
                  }))
                }
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Classification</h2>
        <p className="mt-1 text-sm text-stone-600">Use comma-separated values for classification fields.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Complexity">
            <select
              className={inputClass}
              value={recipe.classification.complexity ?? ''}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  classification: {
                    ...current.classification,
                    complexity: event.target.value === '' ? null : (event.target.value as RecipeComplexity),
                  },
                }))
              }
            >
              <option value="">Not set</option>
              {recipeComplexityValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          {(['dishType', 'mainIngredients', 'season', 'dietary', 'cuisine'] as StringField[]).map((field) => (
            <Field key={field} label={field}>
              <input className={inputClass} value={formatList(recipe.classification[field])} onChange={(event) => updateClassificationList(field, event.target.value)} />
            </Field>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
          <p className="text-sm font-medium text-stone-700">Custom tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.classification.tags.length === 0 ? (
              <span className="text-sm text-stone-500">No custom tags yet.</span>
            ) : (
              recipe.classification.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeCustomTag(tag)}
                  className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-950 ring-1 ring-emerald-900/10"
                  title="Remove tag"
                >
                  {tag} x
                </button>
              ))
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className={`${inputClass} sm:flex-1`}
              value={customTagInput}
              onChange={(event) => setCustomTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="Add a custom tag"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="h-10 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800"
            >
              Add tag
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Personal</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Rating">
            <select
              className={inputClass}
              value={recipe.personal.rating ?? ''}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  personal: { ...current.personal, rating: event.target.value === '' ? null : Number(event.target.value) },
                }))
              }
            >
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Comments">
            <textarea
              className={textareaClass}
              value={recipe.personal.comments.join('\n')}
              onChange={(event) =>
                setRecipeValue((current) => ({
                  ...current,
                  personal: { ...current.personal, comments: event.target.value.split('\n') },
                }))
              }
            />
          </Field>
          <div>
            <p className="text-sm font-medium text-stone-700">Status tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recipeStatusTagValues.map((statusTag) => {
                const checked = recipe.personal.statusTags.includes(statusTag);

                return (
                  <label key={statusTag} className="flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setRecipeValue((current) => ({
                          ...current,
                          personal: {
                            ...current.personal,
                            statusTags: event.target.checked
                              ? [...current.personal.statusTags, statusTag]
                              : current.personal.statusTags.filter((tag) => tag !== statusTag),
                          },
                        }))
                      }
                    />
                    {statusTag}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-900">Cooked sessions</h2>
          <button
            type="button"
            onClick={() =>
              setRecipeValue((current) => ({
                ...current,
                personal: { ...current.personal, cookedSessions: [...current.personal.cookedSessions, emptyCookedSession()] },
              }))
            }
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800"
          >
            Add session
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {recipe.personal.cookedSessions.map((session, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-stone-200 p-3 sm:grid-cols-[1fr_8rem_auto]">
              <input className={inputClass} type="date" value={dateInputValue(session.date)} onChange={(event) => updateCookedSession(index, { date: isoFromDateInput(event.target.value) })} />
              <select className={inputClass} value={session.rating ?? ''} onChange={(event) => updateCookedSession(index, { rating: event.target.value === '' ? null : Number(event.target.value) })}>
                <option value="">Rating</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setRecipeValue((current) => ({
                    ...current,
                    personal: {
                      ...current.personal,
                      cookedSessions: current.personal.cookedSessions.filter((_, itemIndex) => itemIndex !== index),
                    },
                  }))
                }
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800"
              >
                Remove
              </button>
              <textarea className={`${textareaClass} sm:col-span-3`} placeholder="Session notes" value={session.notes ?? ''} onChange={(event) => updateCookedSession(index, { notes: nullableText(event.target.value) })} />
            </div>
          ))}
        </div>
      </div>

      <footer className="flex justify-end gap-2 rounded-md border border-stone-200 bg-white p-3 shadow-sm">
        <Link
          href={cancelHref ?? (id === undefined ? '/recipes' : `/recipes/${recipe.id}`)}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save recipe'}
        </button>
      </footer>
    </section>
  );
}
