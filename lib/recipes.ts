export interface RecipeSummary {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  minutes: number;
  servings: number;
  difficulty: 'Easy' | 'Medium';
  tags: string[];
  ingredients: string[];
  steps: string[];
  notes?: string[];
}

export const recipes: RecipeSummary[] = [
  {
    id: 'focaccia-overnight',
    title: 'Overnight Focaccia',
    subtitle: 'Crisp edges, airy crumb, minimal hands-on work',
    description:
      'A refrigerator-fermented tray focaccia that fits the "quick overnight" rotation and works well for weekend lunches.',
    minutes: 95,
    servings: 8,
    difficulty: 'Easy',
    tags: ['standard rotation', 'quick overnight', 'good for crowd'],
    ingredients: [
      '500 g bread flour',
      '400 g water',
      '10 g fine sea salt',
      '3 g instant yeast',
      '30 g extra-virgin olive oil, plus more for the pan',
      'Flaky salt and rosemary for finishing',
    ],
    steps: [
      'Mix flour, water, salt, yeast, and olive oil until no dry patches remain.',
      'Cover and rest 15 minutes, then perform 3 quick stretch-and-fold rounds over 45 minutes.',
      'Refrigerate the dough overnight in a lightly oiled bowl.',
      'Transfer to an oiled tray, let it relax until puffy, and dimple generously with more olive oil.',
      'Top with rosemary and flaky salt, then bake at 230 C until deeply golden.',
    ],
    notes: ['Best on day one, but slices revive well in a toaster oven.'],
  },
  {
    id: 'weeknight-ragu',
    title: 'Weeknight Turkey Ragu',
    subtitle: 'Fast stovetop sauce for pasta or polenta',
    description:
      'A lighter tomato ragu with soffritto, turkey, and fennel that still feels rich enough for a standard rotation dinner.',
    minutes: 40,
    servings: 4,
    difficulty: 'Easy',
    tags: ['standard rotation', 'kid-friendly'],
    ingredients: [
      '2 tbsp olive oil',
      '1 onion, finely diced',
      '1 carrot, finely diced',
      '1 celery stalk, finely diced',
      '2 garlic cloves, sliced',
      '400 g ground turkey',
      '1 tsp fennel seeds',
      '2 tbsp tomato paste',
      '1 can crushed tomatoes',
      'Salt, black pepper, and parmesan to finish',
    ],
    steps: [
      'Sweat onion, carrot, and celery in olive oil until soft and sweet.',
      'Add garlic, turkey, and fennel seeds, breaking the meat apart as it cooks.',
      'Stir in tomato paste and cook until it darkens slightly.',
      'Add crushed tomatoes and simmer until glossy and thick enough to coat pasta.',
      'Season assertively and finish with parmesan before serving.',
    ],
    notes: ['The sauce freezes well in two-person portions.'],
  },
  {
    id: 'sheet-pan-gnocchi',
    title: 'Sheet-Pan Gnocchi and Peppers',
    subtitle: 'One-pan comfort dinner with crisped edges',
    description:
      'Shelf-stable gnocchi roasted with peppers, chickpeas, and paprika for a low-effort dinner that still feels generous.',
    minutes: 30,
    servings: 4,
    difficulty: 'Easy',
    tags: ['to try', 'good for crowd'],
    ingredients: [
      '500 g shelf-stable gnocchi',
      '2 bell peppers, sliced',
      '1 red onion, cut into wedges',
      '1 can chickpeas, drained',
      '3 tbsp olive oil',
      '1 tsp smoked paprika',
      '1 tsp dried oregano',
      'Salt, pepper, and lemon zest',
    ],
    steps: [
      'Toss everything except lemon zest on a sheet pan until evenly coated.',
      'Roast at 220 C until the vegetables char and the gnocchi turn golden.',
      'Flip once midway so the pan browns evenly.',
      'Finish with lemon zest and serve with yogurt or soft cheese.',
    ],
  },
];

export function getRecipeById(id: string) {
  return recipes.find((recipe) => recipe.id === id);
}

export function getAllTags() {
  return Array.from(new Set(recipes.flatMap((recipe) => recipe.tags)));
}
