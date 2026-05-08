import { NextResponse } from 'next/server';

import { isCloudSyncAuthorized } from '@/lib/cloud/auth';
import { deleteCloudRecipe, isCloudRecipeStoreConfigured } from '@/lib/cloud/recipes';

export const runtime = 'nodejs';

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isCloudRecipeStoreConfigured()) {
    return jsonError(503, 'cloud_store_not_configured', 'DATABASE_URL is not configured for cloud recipe sync.');
  }

  if (!isCloudSyncAuthorized(request)) {
    return jsonError(401, 'cloud_sync_unauthorized', 'Cloud sync token is missing or invalid.');
  }

  const { id } = await params;

  try {
    await deleteCloudRecipe(id, new Date().toISOString());

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return jsonError(500, 'cloud_store_error', 'Cloud recipe deletion could not be recorded.');
  }
}
