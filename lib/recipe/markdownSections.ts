import type { Recipe } from './schema';

export interface RecipeMarkdownSection {
  title: string;
  text: string;
}

function usableText(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const text = value.trim();
  return text.length === 0 ? null : text;
}

export function getRecipeMarkdownSections(recipe: Recipe): RecipeMarkdownSection[] {
  return [
    { title: 'Intro', text: usableText(recipe.markdown.intro) },
    { title: 'Method notes', text: usableText(recipe.markdown.methodNotes) },
    { title: 'Variations', text: usableText(recipe.markdown.variations) },
  ].filter((section): section is RecipeMarkdownSection => section.text !== null);
}
