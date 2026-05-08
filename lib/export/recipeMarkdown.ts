import {
  formatComplexity,
  formatIngredient,
  formatMinutes,
  formatServings,
  groupIngredients,
  groupSteps,
} from '@/lib/recipe/display';
import { getRecipeMarkdownSections } from '@/lib/recipe/markdownSections';
import type { Recipe } from '@/lib/recipe/schema';

function line(value: string): string {
  return `${value}\n`;
}

function metadataLine(label: string, value: string): string {
  return line(`- ${label}: ${value}`);
}

function listText(values: string[]): string {
  return values.length === 0 ? 'None' : values.join(', ');
}

export function recipeToMarkdown(recipe: Recipe): string {
  const ingredients = groupIngredients(recipe.ingredients);
  const steps = groupSteps(recipe.steps);
  const markdownSections = getRecipeMarkdownSections(recipe);
  let markdown = '';

  markdown += line(`# ${recipe.title}`);
  markdown += line('');

  if (recipe.description !== null) {
    markdown += line(recipe.description);
    markdown += line('');
  }

  markdown += line('## Details');
  markdown += metadataLine('Servings', formatServings(recipe));
  markdown += metadataLine('Prep time', formatMinutes(recipe.times.prepMinutes));
  markdown += metadataLine('Cook time', formatMinutes(recipe.times.cookMinutes));
  markdown += metadataLine('Rest time', formatMinutes(recipe.times.restMinutes));
  markdown += metadataLine('Total time', formatMinutes(recipe.times.totalMinutes));
  markdown += metadataLine('Complexity', formatComplexity(recipe.classification.complexity));
  markdown += metadataLine('Rating', recipe.personal.rating === null ? 'Not rated' : `${recipe.personal.rating}/5`);
  markdown += line('');

  markdown += line('## Classification');
  markdown += metadataLine('Dish type', listText(recipe.classification.dishType));
  markdown += metadataLine('Main ingredients', listText(recipe.classification.mainIngredients));
  markdown += metadataLine('Season', listText(recipe.classification.season));
  markdown += metadataLine('Dietary', listText(recipe.classification.dietary));
  markdown += metadataLine('Cuisine', listText(recipe.classification.cuisine));
  markdown += metadataLine('Tags', listText([...recipe.classification.tags, ...recipe.personal.statusTags]));
  markdown += line('');

  markdown += line('## Ingredients');
  if (ingredients.length === 0) {
    markdown += line('No ingredients recorded.');
  } else {
    for (const group of ingredients) {
      markdown += line(`### ${group.title}`);
      for (const ingredient of group.items) {
        markdown += line(`- ${formatIngredient(ingredient)}`);
      }
      markdown += line('');
    }
  }

  markdown += line('## Method');
  if (steps.length === 0) {
    markdown += line('No method recorded.');
  } else {
    for (const group of steps) {
      markdown += line(`### ${group.title}`);
      group.items.forEach((step, index) => {
        const title = step.title === null ? '' : ` ${step.title}:`;
        const duration = step.durationMinutes === null ? '' : ` (${formatMinutes(step.durationMinutes)})`;

        markdown += line(`${index + 1}.${title} ${step.text}${duration}`);
      });
      markdown += line('');
    }
  }

  if (recipe.notes.length > 0) {
    markdown += line('## Notes');
    recipe.notes.forEach((note) => {
      markdown += line(`- ${note}`);
    });
    markdown += line('');
  }

  if (recipe.personal.comments.length > 0) {
    markdown += line('## Personal comments');
    recipe.personal.comments.forEach((comment) => {
      markdown += line(`- ${comment}`);
    });
    markdown += line('');
  }

  if (markdownSections.length > 0) {
    markdown += line('## Original text');
    for (const section of markdownSections) {
      markdown += line(`### ${section.title}`);
      markdown += line(section.text);
      markdown += line('');
    }
  }

  markdown += line('## Source');
  markdown += metadataLine('Type', recipe.source.type);
  markdown += metadataLine('Name', recipe.source.name ?? 'Not recorded');
  markdown += metadataLine('URL', recipe.source.url ?? 'Not recorded');
  markdown += metadataLine('Author', recipe.source.author ?? 'Not recorded');

  return markdown;
}

export function recipeExportSlug(recipe: Recipe): string {
  const slug = recipe.title
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug.length === 0 ? recipe.id : slug;
}
