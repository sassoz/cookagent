import { createEmptyRecipe } from '@/lib/recipe/defaults';
import type { RecipeExtractionInput } from './provider';

const JSON_ONLY_RULES = [
  'Return exactly one JSON object and nothing else.',
  'Do not wrap JSON in Markdown fences.',
  'Do not include comments, explanations, apologies, or trailing prose.',
  'The JSON object must validate against the CookAgent Recipe schema.',
  'Keep JSON field names exactly as shown in the schema, but write every user-facing recipe value in Italian.',
];

const EXTRACTION_RULES = [
  'Translate and write the recipe content in Italian, including title, description, ingredients, steps, notes, tags, cuisine labels, and classification values.',
  'Treat the source as an authored recipe to preserve, not as notes to summarize. Translate faithfully and structure it; do not rewrite it into a shorter generic recipe.',
  'Every user-facing string value must be Italian. This includes ingredient.item, ingredient.originalText, step.text, notes, markdown fields, tags, and classification arrays.',
  'Use English field names only because the persisted schema requires them.',
  'Keep the recipe faithful to the source. Do not add ingredients, steps, times, or quantities that are not supported by the input.',
  'Do not over-summarize the method. Preserve every meaningful action, technique cue, timing hint, optional ingredient, texture target, warning, serving instruction, storage/historical context, and useful aside from the source.',
  'Preserve the authorial voice where useful, translated into Italian. Keep practical jokes, tradition notes, household notes, and serving rituals when they help understand the recipe.',
  'The description should preserve the source introduction/history/context when present. Do not replace a long useful intro with a short generic description.',
  'Split distinct actions into separate steps when that improves review/editing. Do not collapse a multi-step method into one or two broad instructions.',
  'Preserve source paragraph boundaries as separate steps whenever they describe different actions. Do not merge preparation, assembly, decoration, baking, cooling, or serving into the same step.',
  'If the source has separate paragraphs for pan filling, topping, baking, and cooling/serving, create separate steps for each of them.',
  'For URL imports or JSON-LD recipeInstructions, preserve each numbered instruction as its own Recipe step unless it is only a section heading such as DAY ONE or DAY TWO. Use those headings as step.section values for following steps.',
  'For YouTube imports, treat transcript text as noisy spoken source material. Extract only recipe-supported ingredients, quantities, times, steps, and tips. Ignore greetings, subscriptions, sponsor segments, and unrelated chatter.',
  'If a YouTube transcript is unavailable or incomplete, create a cautious review draft from available title/description only and clearly note missing quantities or method details.',
  'Each step.text should be detailed enough to preserve the original sentence-level guidance. Prefer 2-4 detailed sentences over a terse instruction when the source contains nuance.',
  'Preserve source nuance in Italian: examples include pan size, bowl size, ingredient temperature, flour dusting, “do not knead” warnings, optional alcohol, oven position, fan setting, doneness tests, cooling time, how to serve, sensory cues, and humorous/traditional notes.',
  'Put useful asides, caveats, jokes, tradition notes, serving rituals, and uncertainty into notes or markdown.methodNotes instead of dropping them.',
  'Normalize units to metric where possible. ingredient.originalText should preserve useful source wording semantically, but it must still be translated into Italian.',
  'Do not invent precise quantities when the source is unclear. Use null for quantity/unit/note as needed and mention uncertainty in notes in Italian.',
  'If input is incomplete, still produce a useful review draft with the best supported title, ingredients, steps, and notes.',
  'Use null for unknown optional scalar fields and [] for unknown lists.',
  'Do not create nutrition data for the MVP.',
  'Use placeholder image metadata: all image fields should be null unless durable final image metadata is explicitly provided.',
  'Store provided source metadata in source, but do not store raw source text or raw OCR/image content anywhere in the recipe.',
  'If the current source metadata says type book, preserve source.type as book, source.name as the book title, and source.author as the book author when provided.',
  'Set personal.rating to null, personal.comments to [], and personal.cookedSessions to [] unless the input explicitly contains personal data.',
];

const CLASSIFICATION_RULES = [
  'Enrich classification where reasonable from the source, using Italian values.',
  'dishType should contain broad Italian categories such as zuppa, insalata, pane, dolce, piatto principale, contorno, salsa, colazione, snack, bevanda.',
  'complexity must be one of easy, medium, hard, or null.',
  'mainIngredients should list the most important ingredients in Italian.',
  'season should list likely seasons only when obvious, such as primavera, estate, autunno, inverno, tutto l\'anno.',
  'dietary should include clear Italian labels only when supported, such as vegetariano, vegano, senza glutine, senza latticini, contiene carne, contiene pesce.',
  'tags should be practical Italian review/browsing tags such as cena veloce, da preparare in anticipo, una padella, forno, avanzi, dispensa, rapido.',
  'If source.type is book and source.name is present, include a classification tag exactly in the form "libro: <source.name>" so recipes from the same book can be grouped.',
  'personal.statusTags may only use: to try, standard rotation, quick overnight, kid-friendly, good for crowd.',
  'Suggest statusTags only when obvious from the source, for example quick overnight for overnight doughs or good for crowd for large batch recipes.',
];

const FIELD_GUIDANCE = [
  'id must be a non-empty stable draft id. Use a lowercase slug from the title plus a short suffix if needed.',
  'title must be concise and readable.',
  'description should summarize the dish without marketing language.',
  'servings.quantity should be numeric when clear; servings.unit is usually servings, portions, pieces, or null.',
  'times are integer minutes or null. totalMinutes should be the sum of known prep/cook/rest times when supported.',
  'ingredients must have item as a non-empty string. Use group for sections like dough, filling, sauce, topping.',
  'steps must have text as a non-empty string. Preserve source-level detail in the steps; concise does not mean vague.',
  'Never shorten a detailed source step into only a title-like sentence. Include the original rationale and success cues in step.text.',
  'Use section for grouped methods like dough, sauce, bake, assembly.',
  'markdown.intro, markdown.methodNotes, and markdown.variations are nullable Markdown strings for review/editing; use them for source nuance, not raw source dumps.',
  'notes should contain uncertainty, missing information, adaptation notes, or source warnings useful for human review.',
  'createdAt and updatedAt must be valid ISO datetime strings.',
];

const PASTED_RECIPE_EXAMPLE = {
  input:
    'Lemon lentil soup. Serves 4. Cook onion, carrot and garlic in olive oil. Add 250g red lentils, 1 tsp cumin and 1 liter stock. Simmer 25 min. Finish with lemon.',
  output: {
    id: 'lemon-lentil-soup-draft',
    title: 'Lemon Lentil Soup',
    description: 'A simple red lentil soup finished with lemon and cumin.',
    servings: { quantity: 4, unit: 'servings', note: null },
    times: { prepMinutes: null, cookMinutes: 25, restMinutes: null, totalMinutes: 25 },
    ingredients: [
      { group: null, quantity: null, unit: null, item: 'onion', note: null, originalText: 'onion' },
      { group: null, quantity: null, unit: null, item: 'carrot', note: null, originalText: 'carrot' },
      { group: null, quantity: null, unit: null, item: 'garlic', note: null, originalText: 'garlic' },
      { group: null, quantity: '250', unit: 'g', item: 'red lentils', note: null, originalText: '250g red lentils' },
      { group: null, quantity: '1', unit: 'tsp', item: 'ground cumin', note: null, originalText: '1 tsp cumin' },
      { group: null, quantity: '1', unit: 'l', item: 'stock', note: null, originalText: '1 liter stock' },
      { group: null, quantity: null, unit: null, item: 'lemon', note: 'for finishing', originalText: 'Finish with lemon' },
    ],
    steps: [
      { section: null, title: null, text: 'Cook the onion, carrot, and garlic in olive oil until softened.', durationMinutes: null },
      { section: null, title: null, text: 'Add red lentils, cumin, and stock. Simmer until the lentils are tender.', durationMinutes: 25 },
      { section: null, title: null, text: 'Finish with lemon before serving.', durationMinutes: null },
    ],
    notes: ['Prep time and exact aromatics quantities were not specified in the source.'],
    classification: {
      dishType: ['soup'],
      complexity: 'easy',
      mainIngredients: ['red lentils', 'lemon'],
      season: ['fall', 'winter'],
      dietary: ['vegetarian'],
      tags: ['weeknight', 'pantry'],
      cuisine: [],
    },
  },
};

const OCR_RECIPE_EXAMPLE = {
  input:
    'OCR text from cookbook photo: APPLE CAKE 180C 45-50 mins. 3 apples sliced. 200 g flour. 120 g sugar. 2 eggs. butter? mix batter, fold apples, bake. Some text obscured.',
  output: {
    id: 'apple-cake-draft',
    title: 'Apple Cake',
    description: 'A simple apple cake draft from OCR text with some uncertain details.',
    times: { prepMinutes: null, cookMinutes: 50, restMinutes: null, totalMinutes: 50 },
    ingredients: [
      { group: null, quantity: '3', unit: null, item: 'apples', note: 'sliced', originalText: '3 apples sliced' },
      { group: null, quantity: '200', unit: 'g', item: 'flour', note: null, originalText: '200 g flour' },
      { group: null, quantity: '120', unit: 'g', item: 'sugar', note: null, originalText: '120 g sugar' },
      { group: null, quantity: '2', unit: null, item: 'eggs', note: null, originalText: '2 eggs' },
      { group: null, quantity: null, unit: null, item: 'butter', note: 'quantity unclear from OCR', originalText: 'butter?' },
    ],
    steps: [
      { section: null, title: null, text: 'Mix the batter.', durationMinutes: null },
      { section: null, title: null, text: 'Fold in the sliced apples.', durationMinutes: null },
      { section: null, title: null, text: 'Bake at 180 C until done.', durationMinutes: 50 },
    ],
    notes: ['OCR text was incomplete; butter quantity and full method need review.', 'Bake time appeared as 45-50 minutes, stored as 50 minutes.'],
    classification: {
      dishType: ['dessert', 'cake'],
      complexity: 'medium',
      mainIngredients: ['apples', 'flour', 'eggs'],
      season: ['fall'],
      dietary: ['vegetarian'],
      tags: ['baking', 'review needed'],
      cuisine: [],
    },
  },
};

const SHORT_PROMPT_EXAMPLE = {
  input: 'quick kid pasta with tomato, tuna and peas',
  output: {
    id: 'quick-tomato-tuna-pea-pasta-draft',
    title: 'Quick Tomato Tuna Pea Pasta',
    description: 'A rough draft for a quick pasta with tomato, tuna, and peas.',
    ingredients: [
      { group: null, quantity: null, unit: null, item: 'pasta', note: null, originalText: 'pasta' },
      { group: null, quantity: null, unit: null, item: 'tomato', note: null, originalText: 'tomato' },
      { group: null, quantity: null, unit: null, item: 'tuna', note: null, originalText: 'tuna' },
      { group: null, quantity: null, unit: null, item: 'peas', note: null, originalText: 'peas' },
    ],
    steps: [
      { section: null, title: null, text: 'Prepare a pasta dish using tomato, tuna, and peas.', durationMinutes: null },
    ],
    notes: ['The source was an informal prompt, so quantities, timing, and detailed method need review.'],
    classification: {
      dishType: ['main', 'pasta'],
      complexity: 'easy',
      mainIngredients: ['pasta', 'tomato', 'tuna', 'peas'],
      season: ['all season'],
      dietary: ['contains fish'],
      tags: ['quick', 'kid-friendly', 'review needed'],
      cuisine: ['italian-inspired'],
    },
    personal: {
      rating: null,
      comments: [],
      cookedSessions: [],
      statusTags: ['kid-friendly'],
    },
  },
};

const DETAILED_METHOD_EXAMPLE = {
  input:
    'Rustic crumb cake. Coarsely chop almonds: you should feel the pieces, do not turn them into flour. In a really big bowl, mix flour, cornmeal, sugar, almonds for two seconds. Add cubed butter left out for 30 min, dust with flour, squeeze into crumbs, do not knead. Add lemon zest, vanilla, salt, yolks and optional grappa: tradition says yes. Bake 180C fan center rack 50 min until golden and dry but not hard as a brick. Cool 20 min, then do not cut: break with your hands.',
  output: {
    title: 'Torta sbriciolata rustica',
    description: 'Una torta rustica a briciole in cui la consistenza irregolare è parte della ricetta.',
    ingredients: [
      { group: null, quantity: null, unit: null, item: 'mandorle', note: 'tritate grossolanamente', originalText: 'mandorle tritate grossolanamente' },
      { group: null, quantity: null, unit: null, item: 'farina', note: null, originalText: 'farina' },
      { group: null, quantity: null, unit: null, item: 'farina di mais', note: null, originalText: 'farina di mais' },
      { group: null, quantity: null, unit: null, item: 'burro', note: 'a cubetti, lasciato fuori frigo per 30 minuti', originalText: 'burro a cubetti lasciato fuori frigo per 30 minuti' },
      { group: null, quantity: null, unit: null, item: 'grappa', note: 'opzionale, secondo tradizione', originalText: 'grappa opzionale: la tradizione dice di sì' },
    ],
    steps: [
      {
        section: 'Preparazione',
        title: 'Tritare le mandorle',
        text: 'Trita le mandorle grossolanamente: sotto i denti si devono ancora sentire i pezzi. Va bene usare un mixer, ma fermati prima di ridurle in farina.',
        durationMinutes: null,
      },
      {
        section: 'Preparazione',
        title: 'Sbriciolare il burro',
        text: 'Usa una ciotola davvero grande, così il composto non vola fuori. Aggiungi il burro a cubetti lasciato fuori frigo per circa 30 minuti, spolveralo con poca farina e schiaccialo con le dita dentro le polveri: devi ottenere briciole, non impastare.',
        durationMinutes: null,
      },
      {
        section: 'Assemblaggio',
        title: 'Riempire la teglia senza compattare',
        text: 'Versa metà del composto nella teglia e premilo solo leggermente, quanto basta per dargli forma. Aggiungi l’altra metà e livella senza premere troppo: non deve diventare una crostata compatta.',
        durationMinutes: null,
      },
      {
        section: 'Decorazione',
        title: 'Aggiungere mandorle e zucchero',
        text: 'Distribuisci le mandorle non pelate sulla superficie in ordine sparso. Spolvera leggermente con zucchero semolato.',
        durationMinutes: null,
      },
      {
        section: 'Cottura',
        title: 'Cuocere e controllare la consistenza',
        text: 'Cuoci in forno preriscaldato ventilato, in posizione centrale, a 180 °C per circa 50 minuti. Deve essere dorata e asciutta, ma non dura come un mattone: se scuoti la teglia non deve ondeggiare, pur restando una torta che si rompe e si crepa.',
        durationMinutes: 50,
      },
      {
        section: 'Servizio',
        title: 'Rompere con le mani',
        text: 'Lascia raffreddare per almeno 20 minuti. Poi non tagliarla: rompila con le mani, perché questo è parte del bello della ricetta.',
        durationMinutes: 20,
      },
    ],
    notes: ['La grappa è opzionale, ma tradizionale.', 'La torta non va compattata come una crostata: deve rimanere friabile e irregolare.'],
  },
};

function formatRules(title: string, rules: string[]): string {
  return [`## ${title}`, ...rules.map((rule) => `- ${rule}`)].join('\n');
}

function formatExample(title: string, example: { input: string; output: Record<string, unknown> }): string {
  return [
    `## Example: ${title}`,
    'Input:',
    example.input,
    'Selected output fields:',
    JSON.stringify(example.output),
  ].join('\n');
}

export function buildRecipeExtractionPrompt(input: RecipeExtractionInput): string {
  const emptyRecipe = createEmptyRecipe();
  const sourceMetadata = input.source ?? {};
  const sourceText = input.text?.trim() ?? '';

  return [
    '# CookAgent Recipe Extraction',
    'You convert pasted recipe text or OCR/image-derived content into a clean Recipe draft for human review before saving.',
    '',
    formatRules('JSON-only contract', JSON_ONLY_RULES),
    '',
    formatRules('Extraction rules', EXTRACTION_RULES),
    '',
    formatRules('Classification rules', CLASSIFICATION_RULES),
    '',
    formatRules('Field guidance', FIELD_GUIDANCE),
    '',
    '## Required Recipe JSON skeleton',
    JSON.stringify(emptyRecipe),
    '',
    formatExample('pasted recipe', PASTED_RECIPE_EXAMPLE),
    '',
    formatExample('recipe from image/OCR text', OCR_RECIPE_EXAMPLE),
    '',
    formatExample('short informal prompt', SHORT_PROMPT_EXAMPLE),
    '',
    formatExample('detailed method preservation', DETAILED_METHOD_EXAMPLE),
    '',
    '## Current source metadata',
    JSON.stringify(sourceMetadata, null, 2),
    '',
    '## Current source content',
    sourceText.length > 0
      ? sourceText
      : 'No text was provided. If an image is attached, extract only from the image content and mark uncertainty in notes.',
    '',
    'Return the Recipe draft JSON now. JSON only.',
  ].join('\n');
}

export function buildCompactRecipeExtractionPrompt(input: RecipeExtractionInput): string {
  const sourceText = input.text?.trim() ?? '';

  return [
    '/no_think',
    'First character must be { and last character must be }.',
    'Return JSON only with keys: title, description, servingsText, timeText, ingredients, steps, notes, tags, personalStatusTags.',
    'Write all recipe values in Italian. Keep only the JSON keys in English.',
    'Use strings in ingredients and steps. Use null for unknown text fields and [] for unknown lists.',
    'Allowed personalStatusTags: to try, standard rotation, quick overnight, kid-friendly, good for crowd.',
    'Source:',
    sourceText.length > 0
      ? sourceText
      : 'No text was provided. If an image is attached, extract only from the image content and mark uncertainty in notes.',
  ].join('\n');
}
