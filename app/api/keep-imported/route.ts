import { NextResponse } from 'next/server';
import { z } from 'zod';

import { markKeepFilesImported, readKeepImported, writeKeepSelection } from '@/lib/keep/takeout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const importedRequestSchema = z
  .object({
    importedFileNames: z.array(z.string().min(1)),
  })
  .strict();

function unavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message: 'Keep imported state is only available from the local development server.',
      },
    },
    { status: 404 },
  );
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return unavailableResponse();
  }

  const imported = await readKeepImported();

  return NextResponse.json({
    ok: true,
    ...imported,
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

  const result = importedRequestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: 'Imported payload is invalid.',
        },
      },
      { status: 400 },
    );
  }

  const imported = await markKeepFilesImported(result.data.importedFileNames);
  await writeKeepSelection([]);

  return NextResponse.json({
    ok: true,
    ...imported,
  });
}
