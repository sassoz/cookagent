import type { Recipe, RecipeComplexity, RecipeIngredient, RecipeStep } from './schema';

export interface GroupedRecipeItems<T> {
  title: string;
  items: T[];
}

export function formatComplexity(complexity: RecipeComplexity | null): string {
  return complexity === null ? 'Not set' : complexity[0].toUpperCase() + complexity.slice(1);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function formatServings(recipe: Recipe): string {
  const { note, quantity, unit } = recipe.servings;
  const quantityText = quantity === null ? null : quantity.toString();
  const servingsText = [quantityText, unit].filter(Boolean).join(' ');

  return [servingsText || 'Not set', note].filter(Boolean).join(', ');
}

export function formatMinutes(value: number | null): string {
  return value === null ? 'Not set' : `${value} min`;
}

export function formatIngredient(ingredient: RecipeIngredient): string {
  const amount = [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ');
  const mainText = [amount, ingredient.item].filter(Boolean).join(' ');

  return [mainText, ingredient.note].filter(Boolean).join(', ');
}

export function getLastCookedDate(recipe: Recipe): string | null {
  const dates = recipe.personal.cookedSessions.map((session) => session.date).sort();

  return dates.at(-1) ?? null;
}

export function getRecipeTags(recipe: Recipe): string[] {
  const tags = [
    ...recipe.classification.tags,
    ...recipe.personal.statusTags,
    ...recipe.classification.dishType,
    ...recipe.classification.season,
  ];

  return Array.from(new Set(tags));
}

export function groupIngredients(ingredients: RecipeIngredient[]): GroupedRecipeItems<RecipeIngredient>[] {
  return groupByNullableTitle(ingredients, (ingredient) => ingredient.group, 'Ingredients');
}

export function groupSteps(steps: RecipeStep[]): GroupedRecipeItems<RecipeStep>[] {
  return groupByNullableTitle(steps, (step) => step.section, 'Method');
}

function groupByNullableTitle<T>(
  items: T[],
  getTitle: (item: T) => string | null,
  fallbackTitle: string,
): GroupedRecipeItems<T>[] {
  const groups = new Map<string, T[]>();

  items.forEach((item) => {
    const title = getTitle(item) ?? fallbackTitle;
    const group = groups.get(title) ?? [];

    group.push(item);
    groups.set(title, group);
  });

  return Array.from(groups, ([title, groupedItems]) => ({ title, items: groupedItems }));
}
