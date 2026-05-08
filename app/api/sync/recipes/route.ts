import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getCloudRecipes,
  isCloudRecipeStoreConfigured,
  upsertCloudRecipes,
} from '@/lib/cloud/recipes';
import { isCloudSyncAuthorized } from '@/lib/cloud/auth';
import { recipeSchema } from '@/lib/recipe/schema';

export const runtime = 'nodejs';

const pushRequestSchema = z
  .object({
    recipes: z.array(recipeSchema),
  })
  .strict();

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export async function GET(request: Request) {
  if (!isCloudRecipeStoreConfigured()) {
    return jsonError(503, 'cloud_store_not_configured', 'DATABASE_URL is not configured for cloud recipe sync.');
  }

  if (!isCloudSyncAuthorized(request)) {
    return jsonError(401, 'cloud_sync_unauthorized', 'Cloud sync token is missing or invalid.');
  }

  try {
    const recipes = await getCloudRecipes();

    return NextResponse.json({
      ok: true,
      recipes,
    });
  } catch {
    return jsonError(500, 'cloud_store_error', 'Cloud recipes could not be loaded.');
  }
}

export async function PUT(request: Request) {
  if (!isCloudRecipeStoreConfigured()) {
    return jsonError(503, 'cloud_store_not_configured', 'DATABASE_URL is not configured for cloud recipe sync.');
  }

  if (!isCloudSyncAuthorized(request)) {
    return jsonError(401, 'cloud_sync_unauthorized', 'Cloud sync token is missing or invalid.');
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_request_json', 'Request body must be valid JSON.');
  }

  const result = pushRequestSchema.safeParse(body);

  if (!result.success) {
    return jsonError(400, 'invalid_sync_payload', 'Cloud sync payload is invalid.');
  }

  try {
    await upsertCloudRecipes(result.data.recipes);

    return NextResponse.json({
      ok: true,
      saved: result.data.recipes.length,
    });
  } catch {
    return jsonError(500, 'cloud_store_error', 'Cloud recipes could not be saved.');
  }
}
