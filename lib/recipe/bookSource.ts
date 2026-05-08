import type { Recipe } from './schema';

export function sourceBookTag(source: Recipe['source']): string | null {
  if (source.type !== 'book' || source.name === null) {
    return null;
  }

  const bookName = source.name.trim();
  return bookName.length === 0 ? null : `libro: ${bookName}`;
}

export function withBookClassification(recipe: Recipe): Recipe {
  const tag = sourceBookTag(recipe.source);

  if (tag === null || recipe.classification.tags.some((existingTag) => existingTag.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
    return recipe;
  }

  return {
    ...recipe,
    classification: {
      ...recipe.classification,
      tags: [...recipe.classification.tags, tag],
    },
  };
}
