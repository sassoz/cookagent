import { NextResponse } from 'next/server';

import { listKeepNotes, readKeepImported, readKeepSelection } from '@/lib/keep/takeout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message: 'Keep import is only available from the local development server.',
      },
    },
    { status: 404 },
  );
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return unavailableResponse();
  }

  try {
    const [notes, selection, imported] = await Promise.all([listKeepNotes(), readKeepSelection(), readKeepImported()]);

    return NextResponse.json({
      ok: true,
      notes: notes.map((note) => ({
        ...note,
        isImported: imported.importedFileNames.includes(note.fileName),
      })),
      selectedFileNames: selection.selectedFileNames,
      selectionUpdatedAt: selection.updatedAt,
      importedFileNames: imported.importedFileNames,
      importedUpdatedAt: imported.updatedAt,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: 'Keep notes could not be loaded from the local Keep folder.',
        },
      },
      { status: 500 },
    );
  }
}
