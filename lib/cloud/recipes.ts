import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

import { recipeSchema, type Recipe } from '@/lib/recipe/schema';

interface CloudRecipeRow {
  id: string;
  data: unknown;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

let sqlClient: NeonQueryFunction<false, false> | null = null;

function databaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL?.trim();

  return value === undefined || value.length === 0 ? undefined : value;
}

function getSql(): NeonQueryFunction<false, false> {
  const url = databaseUrl();

  if (url === undefined) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (sqlClient === null) {
    sqlClient = neon(url);
  }

  return sqlClient;
}

async function ensureSchema(): Promise<void> {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS cookagent_recipes (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS cookagent_recipes_updated_at_idx
    ON cookagent_recipes (updated_at DESC)
  `;
}

function parseRow(row: CloudRecipeRow): Recipe | null {
  if (row.deleted_at !== null) {
    return null;
  }

  return recipeSchema.parse(row.data);
}

export function isCloudRecipeStoreConfigured(): boolean {
  return databaseUrl() !== undefined;
}

export async function getCloudRecipes(): Promise<Recipe[]> {
  await ensureSchema();

  const rows = (await getSql()`
    SELECT id, data, updated_at, deleted_at
    FROM cookagent_recipes
    WHERE deleted_at IS NULL
    ORDER BY updated_at DESC
  `) as CloudRecipeRow[];

  return rows.map(parseRow).filter((recipe): recipe is Recipe => recipe !== null);
}

export async function upsertCloudRecipes(recipes: Recipe[]): Promise<void> {
  await ensureSchema();

  const sql = getSql();

  for (const recipe of recipes) {
    const parsedRecipe = recipeSchema.parse(recipe);

    await sql`
      INSERT INTO cookagent_recipes (id, data, updated_at, deleted_at)
      VALUES (${parsedRecipe.id}, ${JSON.stringify(parsedRecipe)}::jsonb, ${parsedRecipe.updatedAt}, NULL)
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at,
        deleted_at = NULL
      WHERE cookagent_recipes.updated_at <= EXCLUDED.updated_at
         OR cookagent_recipes.deleted_at IS NOT NULL
    `;
  }
}

export async function deleteCloudRecipe(id: string, deletedAt: string): Promise<void> {
  await ensureSchema();

  await getSql()`
    INSERT INTO cookagent_recipes (id, data, updated_at, deleted_at)
    VALUES (${id}, '{}'::jsonb, ${deletedAt}, ${deletedAt})
    ON CONFLICT (id) DO UPDATE SET
      updated_at = EXCLUDED.updated_at,
      deleted_at = EXCLUDED.deleted_at
    WHERE cookagent_recipes.updated_at <= EXCLUDED.updated_at
  `;
}
