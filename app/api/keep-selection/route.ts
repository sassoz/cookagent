import { NextResponse } from 'next/server';
import { z } from 'zod';

import { readKeepSelection, writeKeepSelection } from '@/lib/keep/takeout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const selectionRequestSchema = z
  .object({
    selectedFileNames: z.array(z.string().min(1)),
  })
  .strict();

function unavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message: 'Keep import selection is only available from the local development server.',
      },
    },
    { status: 404 },
  );
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return unavailableResponse();
  }

  const selection = await readKeepSelection();

  return NextResponse.json({
    ok: true,
    ...selection,
  });
}

export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return unavailableResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: 'Request body must be valid JSON.',
        },
      },
      { status: 400 },
    );
  }

  const result = selectionRequestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: 'Selection payload is invalid.',
        },
      },
      { status: 400 },
    );
  }

  const selection = await writeKeepSelection(result.data.selectedFileNames);

  return NextResponse.json({
    ok: true,
    ...selection,
  });
}
