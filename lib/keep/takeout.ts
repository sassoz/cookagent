import { promises as fs } from 'fs';
import path from 'path';

import { z } from 'zod';

const keepLabelSchema = z.object({
  name: z.string(),
});

const keepListItemSchema = z.object({
  text: z.string().optional(),
  isChecked: z.boolean().optional(),
});

const keepNoteSchema = z
  .object({
    title: z.string().optional(),
    textContent: z.string().optional(),
    listContent: z.array(keepListItemSchema).optional(),
    labels: z.array(keepLabelSchema).optional(),
    isTrashed: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    color: z.string().optional(),
    createdTimestampUsec: z.number().optional(),
    userEditedTimestampUsec: z.number().optional(),
  })
  .passthrough();

export interface KeepNoteSummary {
  fileName: string;
  title: string;
  labels: string[];
  preview: string;
  text: string;
  textLength: number;
  listItemCount: number;
  isArchived: boolean;
  isPinned: boolean;
  isTrashed: boolean;
  color: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface KeepSelectionFile {
  selectedFileNames: string[];
  updatedAt: string;
}

export interface KeepImportedFile {
  importedFileNames: string[];
  updatedAt: string;
}

const keepDirectory = path.join(process.cwd(), 'Keep');
const selectionDirectory = path.join(process.cwd(), '.cookagent');
const selectionPath = path.join(selectionDirectory, 'keep-selection.json');
const importedPath = path.join(selectionDirectory, 'keep-imported.json');

function timestampUsecToIso(value: number | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  return new Date(Math.floor(value / 1000)).toISOString();
}

function compactPreview(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 260);
}

function noteText(note: z.infer<typeof keepNoteSchema>): string {
  if (note.textContent !== undefined) {
    return note.textContent;
  }

  if (note.listContent !== undefined) {
    return note.listContent.map((item) => item.text ?? '').join('\n');
  }

  return '';
}

async function readKeepNote(fileName: string): Promise<KeepNoteSummary> {
  const fullPath = path.join(keepDirectory, fileName);
  const raw = await fs.readFile(fullPath, 'utf8');
  const note = keepNoteSchema.parse(JSON.parse(raw));
  const text = noteText(note);
  const title = note.title?.trim() || fileName.replace(/\.json$/i, '');

  return {
    fileName,
    title,
    labels: note.labels?.map((label) => label.name).filter((label) => label.trim().length > 0) ?? [],
    preview: compactPreview(text),
    text,
    textLength: text.trim().length,
    listItemCount: note.listContent?.length ?? 0,
    isArchived: note.isArchived ?? false,
    isPinned: note.isPinned ?? false,
    isTrashed: note.isTrashed ?? false,
    color: note.color ?? 'DEFAULT',
    createdAt: timestampUsecToIso(note.createdTimestampUsec),
    updatedAt: timestampUsecToIso(note.userEditedTimestampUsec),
  };
}

export async function listKeepNotes(): Promise<KeepNoteSummary[]> {
  const entries = await fs.readdir(keepDirectory, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name);

  const notes = await Promise.all(jsonFiles.map(readKeepNote));

  return notes.sort((a, b) => {
    const updatedA = a.updatedAt ?? a.createdAt ?? '';
    const updatedB = b.updatedAt ?? b.createdAt ?? '';
    return updatedB.localeCompare(updatedA);
  });
}

export async function readKeepSelection(): Promise<KeepSelectionFile> {
  try {
    const raw = await fs.readFile(selectionPath, 'utf8');
    return z
      .object({
        selectedFileNames: z.array(z.string()),
        updatedAt: z.string(),
      })
      .parse(JSON.parse(raw));
  } catch {
    return {
      selectedFileNames: [],
      updatedAt: new Date(0).toISOString(),
    };
  }
}

export async function readKeepImported(): Promise<KeepImportedFile> {
  try {
    const raw = await fs.readFile(importedPath, 'utf8');
    return z
      .object({
        importedFileNames: z.array(z.string()),
        updatedAt: z.string(),
      })
      .parse(JSON.parse(raw));
  } catch {
    return {
      importedFileNames: [],
      updatedAt: new Date(0).toISOString(),
    };
  }
}

export async function writeKeepSelection(selectedFileNames: string[]): Promise<KeepSelectionFile> {
  const uniqueFileNames = Array.from(new Set(selectedFileNames)).sort((a, b) => a.localeCompare(b));
  const selection = {
    selectedFileNames: uniqueFileNames,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(selectionDirectory, { recursive: true });
  await fs.writeFile(selectionPath, `${JSON.stringify(selection, null, 2)}\n`, 'utf8');

  return selection;
}

export async function writeKeepImported(importedFileNames: string[]): Promise<KeepImportedFile> {
  const uniqueFileNames = Array.from(new Set(importedFileNames)).sort((a, b) => a.localeCompare(b));
  const imported = {
    importedFileNames: uniqueFileNames,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(selectionDirectory, { recursive: true });
  await fs.writeFile(importedPath, `${JSON.stringify(imported, null, 2)}\n`, 'utf8');

  return imported;
}

export async function markKeepFilesImported(fileNames: string[]): Promise<KeepImportedFile> {
  const current = await readKeepImported();

  return writeKeepImported([...current.importedFileNames, ...fileNames]);
}
