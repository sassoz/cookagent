import { getRecipe, saveRecipe } from './repositories';
import { createEmptyRecipe } from '@/lib/recipe/defaults';
import type { Recipe } from '@/lib/recipe/schema';

function buildSeedRecipe(overrides: Partial<Recipe> & Pick<Recipe, 'id' | 'title'>): Recipe {
  const recipe = createEmptyRecipe();
  const now = new Date().toISOString();

  return {
    ...recipe,
    ...overrides,
    image: {
      ...recipe.image,
      ...overrides.image,
    },
    source: {
      ...recipe.source,
      ...overrides.source,
    },
    servings: {
      ...recipe.servings,
      ...overrides.servings,
    },
    times: {
      ...recipe.times,
      ...overrides.times,
    },
    classification: {
      ...recipe.classification,
      ...overrides.classification,
    },
    personal: {
      ...recipe.personal,
      ...overrides.personal,
    },
    markdown: {
      ...recipe.markdown,
      ...overrides.markdown,
    },
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

const developmentSeedRecipes: Recipe[] = [
  buildSeedRecipe({
    id: 'dev-lentil-soup',
    title: 'Red Lentil Soup',
    description: 'A weeknight soup with lemon, cumin, and enough body for leftovers.',
    servings: { quantity: 4, unit: 'servings', note: null },
    times: { prepMinutes: 10, cookMinutes: 25, restMinutes: null, totalMinutes: 35 },
    ingredients: [
      { group: null, quantity: '1', unit: 'onion', item: 'yellow onion', note: 'diced', originalText: '1 yellow onion, diced' },
      { group: null, quantity: '250', unit: 'g', item: 'red lentils', note: 'rinsed', originalText: '250 g red lentils, rinsed' },
      { group: null, quantity: '1', unit: 'tsp', item: 'ground cumin', note: null, originalText: '1 tsp ground cumin' },
    ],
    steps: [
      { section: null, title: null, text: 'Sweat the onion with olive oil and salt until soft.', durationMinutes: 8 },
      { section: null, title: null, text: 'Add lentils, cumin, and stock, then simmer until the lentils collapse.', durationMinutes: 25 },
      { section: null, title: null, text: 'Finish with lemon juice and adjust salt before serving.', durationMinutes: null },
    ],
    classification: {
      dishType: ['soup'],
      complexity: 'easy',
      mainIngredients: ['red lentils', 'onion'],
      season: ['winter', 'fall'],
      dietary: ['vegetarian'],
      tags: ['weeknight', 'leftovers'],
      cuisine: ['middle eastern-inspired'],
    },
    personal: {
      rating: 4,
      comments: ['Good with yogurt and chili oil.'],
      cookedSessions: [{ date: '2026-04-11T18:30:00.000Z', notes: 'Used more lemon.', rating: 4 }],
      statusTags: ['standard rotation'],
    },
    image: {
      url: '/red-lentil-soup.png',
      storageKey: null,
      altText: 'Red lentil soup in a white bowl',
      width: 1024,
      height: 1024,
      mimeType: 'image/png',
    },
  }),
  buildSeedRecipe({
    id: 'dev-sheet-pan-gnocchi',
    title: 'Sheet-Pan Gnocchi and Peppers',
    description: 'Crisped shelf-stable gnocchi with peppers, chickpeas, and paprika.',
    servings: { quantity: 4, unit: 'servings', note: null },
    times: { prepMinutes: 10, cookMinutes: 25, restMinutes: null, totalMinutes: 35 },
    ingredients: [
      { group: null, quantity: '500', unit: 'g', item: 'shelf-stable gnocchi', note: null, originalText: '500 g shelf-stable gnocchi' },
      { group: null, quantity: '2', unit: null, item: 'bell peppers', note: 'sliced', originalText: '2 bell peppers, sliced' },
      { group: null, quantity: '1', unit: 'can', item: 'chickpeas', note: 'drained', originalText: '1 can chickpeas, drained' },
    ],
    steps: [
      { section: null, title: null, text: 'Toss everything on a hot sheet pan with olive oil and smoked paprika.', durationMinutes: 5 },
      { section: null, title: null, text: 'Roast until the gnocchi is crisp and the peppers are browned at the edges.', durationMinutes: 25 },
    ],
    classification: {
      dishType: ['main'],
      complexity: 'easy',
      mainIngredients: ['gnocchi', 'bell peppers', 'chickpeas'],
      season: ['spring', 'summer'],
      dietary: ['vegetarian'],
      tags: ['one pan', 'weeknight'],
      cuisine: ['italian-inspired'],
    },
    personal: {
      rating: 5,
      comments: [],
      cookedSessions: [{ date: '2026-03-27T19:00:00.000Z', notes: null, rating: 5 }],
      statusTags: ['kid-friendly', 'good for crowd'],
    },
    image: {
      url: '/sheet-pan-gnocchi.png',
      storageKey: null,
      altText: 'Sheet-pan gnocchi with peppers and chickpeas',
      width: 1024,
      height: 1024,
      mimeType: 'image/png',
    },
  }),
  buildSeedRecipe({
    id: 'dev-overnight-focaccia',
    title: 'Overnight Focaccia',
    description: 'A refrigerator-fermented tray focaccia with crisp edges and an airy crumb.',
    servings: { quantity: 8, unit: 'servings', note: null },
    times: { prepMinutes: 30, cookMinutes: 25, restMinutes: 720, totalMinutes: 775 },
    ingredients: [
      { group: null, quantity: '500', unit: 'g', item: 'bread flour', note: null, originalText: '500 g bread flour' },
      { group: null, quantity: '400', unit: 'g', item: 'water', note: null, originalText: '400 g water' },
      { group: null, quantity: '3', unit: 'g', item: 'instant yeast', note: null, originalText: '3 g instant yeast' },
    ],
    steps: [
      { section: null, title: null, text: 'Mix the dough until no dry flour remains, then rest and fold.', durationMinutes: 45 },
      { section: null, title: null, text: 'Refrigerate overnight in an oiled bowl.', durationMinutes: 720 },
      { section: null, title: null, text: 'Dimple in a tray with olive oil and bake until deeply golden.', durationMinutes: 25 },
    ],
    classification: {
      dishType: ['bread', 'side'],
      complexity: 'medium',
      mainIngredients: ['bread flour', 'olive oil'],
      season: ['all season'],
      dietary: ['vegetarian'],
      tags: ['baking', 'make ahead'],
      cuisine: ['italian'],
    },
    personal: {
      rating: null,
      comments: [],
      cookedSessions: [],
      statusTags: ['to try', 'quick overnight', 'good for crowd'],
    },
    image: {
      url: '/overnight-focaccia.png',
      storageKey: null,
      altText: 'Golden overnight focaccia with rosemary',
      width: 1024,
      height: 1024,
      mimeType: 'image/png',
    },
  }),
];

export async function seedDevelopmentRecipes(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  await Promise.all(
    developmentSeedRecipes.map(async (recipe) => {
      const existingRecipe = await getRecipe(recipe.id);

      if (existingRecipe === undefined) {
        await saveRecipe(recipe);
        return;
      }

      if (existingRecipe.image.url === null && recipe.image.url !== null) {
        await saveRecipe({
          ...existingRecipe,
          image: recipe.image,
        });
      }
    }),
  );
}
