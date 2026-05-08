'use client';

import { useEffect, useMemo, useState } from 'react';

interface KeepNoteSummary {
  fileName: string;
  title: string;
  labels: string[];
  preview: string;
  text: string;
  textLength: number;
  listItemCount: number;
  isImported: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isTrashed: boolean;
  color: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface KeepNotesResponse {
  ok?: boolean;
  notes?: KeepNoteSummary[];
  selectedFileNames?: string[];
  selectionUpdatedAt?: string;
  error?: {
    message?: string;
  };
}

interface KeepSelectionResponse {
  ok?: boolean;
  selectedFileNames?: string[];
  updatedAt?: string;
  error?: {
    message?: string;
  };
}

function formatDate(value: string | null): string {
  if (value === null) {
    return 'No date';
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function responseMessage(payload: KeepNotesResponse | KeepSelectionResponse, fallback: string): string {
  return payload.error?.message ?? fallback;
}

export function KeepImportSelector() {
  const [notes, setNotes] = useState<KeepNoteSummary[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [onlyRecipes, setOnlyRecipes] = useState(true);
  const [showTrashed, setShowTrashed] = useState(false);
  const [showImported, setShowImported] = useState(false);
  const [expandedFileNames, setExpandedFileNames] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Loading Keep notes...');

  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/keep-notes');
        const payload = (await response.json()) as KeepNotesResponse;

        if (!response.ok || payload.ok !== true || payload.notes === undefined) {
          throw new Error(responseMessage(payload, 'Keep notes could not be loaded.'));
        }

        if (isMounted) {
          setNotes(payload.notes);
          setSelectedFileNames(new Set(payload.selectedFileNames ?? []));
          setMessage(
            `Loaded ${payload.notes.length} Keep notes. ${payload.selectedFileNames?.length ?? 0} note${
              payload.selectedFileNames?.length === 1 ? '' : 's'
            } already selected.`,
          );
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : 'Keep notes could not be loaded.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      isMounted = false;
    };
  }, []);

  const recipeCount = useMemo(
    () => notes.filter((note) => note.labels.some((label) => label.toLocaleLowerCase() === 'ricette')).length,
    [notes],
  );

  const filteredNotes = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);

    return notes.filter((note) => {
      const hasRecipeLabel = note.labels.some((label) => label.toLocaleLowerCase() === 'ricette');
      const matchesRecipeFilter = !onlyRecipes || hasRecipeLabel;
      const matchesTrashedFilter = showTrashed || !note.isTrashed;
      const matchesImportedFilter = showImported || !note.isImported;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        normalizeSearchValue(note.title).includes(normalizedQuery) ||
        normalizeSearchValue(note.preview).includes(normalizedQuery) ||
        note.labels.some((label) => normalizeSearchValue(label).includes(normalizedQuery));

      return matchesRecipeFilter && matchesTrashedFilter && matchesImportedFilter && matchesQuery;
    });
  }, [notes, onlyRecipes, query, showImported, showTrashed]);

  const visibleFileNames = useMemo(() => filteredNotes.map((note) => note.fileName), [filteredNotes]);
  const visibleSelectedCount = visibleFileNames.filter((fileName) => selectedFileNames.has(fileName)).length;
  const allVisibleSelected = visibleFileNames.length > 0 && visibleSelectedCount === visibleFileNames.length;

  function toggleSelection(fileName: string) {
    setSelectedFileNames((current) => {
      const next = new Set(current);

      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }

      return next;
    });
  }

  function toggleExpanded(fileName: string) {
    setExpandedFileNames((current) => {
      const next = new Set(current);

      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }

      return next;
    });
  }

  function setVisibleSelection(shouldSelect: boolean) {
    setSelectedFileNames((current) => {
      const next = new Set(current);

      for (const fileName of visibleFileNames) {
        if (shouldSelect) {
          next.add(fileName);
        } else {
          next.delete(fileName);
        }
      }

      return next;
    });
  }

  async function saveSelection() {
    try {
      setIsSaving(true);
      const selected = Array.from(selectedFileNames);
      const response = await fetch('/api/keep-selection', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedFileNames: selected }),
      });
      const payload = (await response.json()) as KeepSelectionResponse;

      if (!response.ok || payload.ok !== true) {
        throw new Error(responseMessage(payload, 'Keep selection could not be saved.'));
      }

      setMessage(`Saved ${payload.selectedFileNames?.length ?? selected.length} selected note${selected.length === 1 ? '' : 's'} for ingest.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Keep selection could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-800">Keep Takeout</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Preselect notes for recipe ingest</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
              Review the local Google Keep export, mark the notes to import, then save the selection for the next ingest step.
            </p>
          </div>
          <div className="rounded-md bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
            <p>
              <span className="font-semibold text-stone-900">{notes.length}</span> notes
            </p>
            <p>
              <span className="font-semibold text-stone-900">{recipeCount}</span> tagged Ricette
            </p>
            <p>
              <span className="font-semibold text-stone-900">{selectedFileNames.size}</span> selected
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
          <label className="grid gap-1 text-sm font-medium text-stone-700">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, label, or text preview"
              className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
          </label>
          <label className="flex h-10 items-center gap-2 self-end rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800">
            <input type="checkbox" checked={onlyRecipes} onChange={(event) => setOnlyRecipes(event.target.checked)} />
            Ricette only
          </label>
          <label className="flex h-10 items-center gap-2 self-end rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800">
            <input type="checkbox" checked={showTrashed} onChange={(event) => setShowTrashed(event.target.checked)} />
            Show trashed
          </label>
          <label className="flex h-10 items-center gap-2 self-end rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800">
            <input type="checkbox" checked={showImported} onChange={(event) => setShowImported(event.target.checked)} />
            Show imported
          </label>
          <button
            type="button"
            disabled={isLoading || filteredNotes.length === 0}
            onClick={() => setVisibleSelection(!allVisibleSelected)}
            className="h-10 self-end rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {allVisibleSelected ? 'Clear visible' : 'Select visible'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">{message}</p>
          <button
            type="button"
            disabled={isLoading || isSaving}
            onClick={() => void saveSelection()}
            className="h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save selection for ingest'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredNotes.map((note) => {
          const isSelected = selectedFileNames.has(note.fileName);
          const isExpanded = expandedFileNames.has(note.fileName);
          const isRecipe = note.labels.some((label) => label.toLocaleLowerCase() === 'ricette');

          return (
            <article
              key={note.fileName}
              className={`rounded-md border bg-white p-4 shadow-sm ${
                isSelected ? 'border-emerald-700 ring-2 ring-emerald-700/10' : 'border-stone-200'
              }`}
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(note.fileName)}
                  aria-label={`Select ${note.title}`}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="break-words text-lg font-semibold text-stone-900">{note.title}</h2>
                      <p className="mt-1 text-xs text-stone-500">{note.fileName}</p>
                    </div>
                    <p className="shrink-0 text-xs font-medium text-stone-500">Updated {formatDate(note.updatedAt)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {note.labels.map((label) => (
                      <span
                        key={label}
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                          label.toLocaleLowerCase() === 'ricette' ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                    {isRecipe ? null : <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">No Ricette label</span>}
                    {note.isArchived ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">Archived</span> : null}
                    {note.isPinned ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">Pinned</span> : null}
                    {note.isTrashed ? <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-800">Trashed</span> : null}
                    {note.isImported ? (
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900">Imported</span>
                    ) : null}
                    <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">{note.textLength} chars</span>
                    {note.listItemCount > 0 ? (
                      <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">{note.listItemCount} list items</span>
                    ) : null}
                  </div>

                  {note.preview.length === 0 ? (
                    <p className="mt-3 text-sm italic text-stone-500">No text preview.</p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-stone-700">{note.preview}</p>
                  )}

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(note.fileName)}
                      disabled={note.text.trim().length === 0}
                      className="h-9 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-800 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isExpanded ? 'Hide full text' : 'Show full text'}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-4 font-sans text-sm leading-6 text-stone-800">
                      {note.text}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!isLoading && filteredNotes.length === 0 ? (
        <p className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">No Keep notes match these filters.</p>
      ) : null}
    </section>
  );
}
