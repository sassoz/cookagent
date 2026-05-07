'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { ReviewDraft } from '@/components/review-draft';
import { imageFileFromClipboard } from '@/lib/browser/clipboardImage';
import { recipeSchema, type Recipe } from '@/lib/recipe/schema';

type IngestionTab = 'paste' | 'image' | 'url';
type ExtractionStatus = 'idle' | 'ready' | 'extracting' | 'draft-ready';

interface TemporaryImage {
  file: File;
  previewUrl: string;
}

const acceptedImageTypes = 'image/png,image/jpeg,image/webp,image/heic,image/heif';

function statusText(status: ExtractionStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready to extract.';
    case 'extracting':
      return 'Extracting recipe draft. This can take a little while.';
    case 'draft-ready':
      return 'Draft review placeholder is ready.';
    case 'idle':
    default:
      return 'Add text or an image to begin.';
  }
}

function progressText(elapsedSeconds: number): string {
  if (elapsedSeconds < 5) {
    return 'Sending source to the extraction endpoint...';
  }

  if (elapsedSeconds < 25) {
    return 'Provider is generating a structured recipe draft...';
  }

  if (elapsedSeconds < 90) {
    return 'Still working. Local or hosted model responses can take more than a minute.';
  }

  return 'Still processing. Local model responses can be slow, but the request can still complete.';
}

export function IngestionWorkbench() {
  const [activeTab, setActiveTab] = useState<IngestionTab>('paste');
  const [recipeText, setRecipeText] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [temporaryImage, setTemporaryImage] = useState<TemporaryImage | null>(null);
  const [saveImageAsRecipePhoto, setSaveImageAsRecipePhoto] = useState(false);
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [draftRecipe, setDraftRecipe] = useState<Recipe | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    return () => {
      if (temporaryImage !== null) {
        URL.revokeObjectURL(temporaryImage.previewUrl);
      }
    };
  }, [temporaryImage]);

  useEffect(() => {
    if (status !== 'extracting') {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  const canExtract =
    (activeTab === 'paste' && recipeText.trim().length > 0) ||
    (activeTab === 'url' && recipeUrl.trim().length > 0) ||
    (activeTab === 'image' && temporaryImage !== null);

  function handleImagePaste(event: React.ClipboardEvent) {
    const file = imageFileFromClipboard(event);

    if (file === null) {
      return;
    }

    event.preventDefault();
    setImage(file);
  }

  function setImage(file: File | undefined) {
    if (temporaryImage !== null) {
      URL.revokeObjectURL(temporaryImage.previewUrl);
    }

    if (file === undefined) {
      setTemporaryImage(null);
      setSaveImageAsRecipePhoto(false);
      setStatus('idle');
      return;
    }

    setTemporaryImage({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    setStatus('ready');
    setDraftRecipe(null);
    setExtractError(null);
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Image could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  async function imageDimensions(dataUrl: string): Promise<{ height: number | null; width: number | null }> {
    return new Promise((resolve) => {
      const image = new window.Image();

      image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
      image.onerror = () => resolve({ height: null, width: null });
      image.src = dataUrl;
    });
  }

  async function handleExtract() {
    if (!canExtract) {
      setStatus('idle');
      return;
    }

    setExtractError(null);
    setDraftRecipe(null);
    setStatus('extracting');

    try {
      const selectedImageDataUrl = temporaryImage === null ? null : await fileToDataUrl(temporaryImage.file);
      const response = await fetch('/api/llm/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: activeTab === 'paste' ? recipeText : undefined,
          url: activeTab === 'url' ? recipeUrl : undefined,
          imageBase64: selectedImageDataUrl === null ? undefined : selectedImageDataUrl.split(',')[1] ?? selectedImageDataUrl,
          imageMimeType: temporaryImage?.file.type,
          source: {
            type: activeTab === 'paste' ? 'pasted-text' : activeTab,
            name: activeTab === 'paste' ? 'Pasted recipe text' : activeTab === 'url' ? recipeUrl : temporaryImage?.file.name,
            url: activeTab === 'url' ? recipeUrl : undefined,
            accessedAt: new Date().toISOString(),
          },
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; draft?: unknown; error?: { message?: string } };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error?.message ?? 'Extraction failed.');
      }

      const draftResult = recipeSchema.safeParse(payload.draft);

      if (!draftResult.success) {
        throw new Error('The extracted draft did not match the recipe editor format.');
      }

      if (saveImageAsRecipePhoto && temporaryImage !== null && selectedImageDataUrl !== null) {
        const dimensions = await imageDimensions(selectedImageDataUrl);

        setDraftRecipe({
          ...draftResult.data,
          image: {
            url: selectedImageDataUrl,
            storageKey: null,
            altText: draftResult.data.image.altText ?? draftResult.data.title,
            width: dimensions.width,
            height: dimensions.height,
            mimeType: temporaryImage.file.type || null,
          },
        });
      } else {
        setDraftRecipe(draftResult.data);
      }
      setStatus('draft-ready');
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Extraction failed.');
      setStatus('ready');
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase text-emerald-800">Capture</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Ingest a new recipe</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
          Add source material, run extraction when the API is connected, then review a structured draft before saving.
        </p>
      </header>

      <div className="rounded-md border border-stone-200 bg-white shadow-sm">
        <div className="grid grid-cols-3 border-b border-stone-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-3 ${activeTab === 'paste' ? 'bg-emerald-50 text-emerald-950' : 'text-stone-600'}`}
          >
            Paste text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`px-3 py-3 ${activeTab === 'image' ? 'bg-emerald-50 text-emerald-950' : 'text-stone-600'}`}
          >
            Image/photo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-3 ${activeTab === 'url' ? 'bg-emerald-50 text-emerald-950' : 'text-stone-600'}`}
          >
            URL
          </button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            {activeTab === 'paste' ? (
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Recipe text</span>
                <textarea
                  value={recipeText}
                  onChange={(event) => {
                    setRecipeText(event.target.value);
                    setStatus(event.target.value.trim().length > 0 ? 'ready' : 'idle');
                    setDraftRecipe(null);
                    setExtractError(null);
                  }}
                  placeholder="Paste the recipe title, ingredients, method, notes, or copied web text here."
                  className="min-h-80 rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-7 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                />
              </label>
            ) : activeTab === 'url' ? (
              <div className="rounded-md border border-stone-200 bg-white p-4">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Recipe URL</span>
                  <input
                    type="url"
                    value={recipeUrl}
                    onChange={(event) => {
                      setRecipeUrl(event.target.value);
                      setStatus(event.target.value.trim().length > 0 ? 'ready' : 'idle');
                      setDraftRecipe(null);
                      setExtractError(null);
                    }}
                    placeholder="https://example.com/recipe"
                    className="h-11 rounded-md border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                </label>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Cookagent will fetch the page on the backend, prefer structured recipe metadata when available, and save only recipe metadata in the final draft.
                </p>
              </div>
            ) : (
              <div className="space-y-4" onPaste={handleImagePaste}>
                <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4">
                  <p className="text-sm font-semibold text-stone-900">Upload screenshot or book photo</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Select, take, or paste an image from the clipboard. The selected image stays in this browser session for extraction preview only.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Select image</span>
                      <input
                        type="file"
                        accept={acceptedImageTypes}
                        onChange={(event) => setImage(event.target.files?.[0])}
                        className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Take photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) => setImage(event.target.files?.[0])}
                        className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                      />
                    </label>
                  </div>
                  <label className="mt-4 flex items-start gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={saveImageAsRecipePhoto}
                      onChange={(event) => setSaveImageAsRecipePhoto(event.target.checked)}
                      className="mt-1"
                    />
                    <span>Save this selected image as the recipe photo after extraction.</span>
                  </label>
                </div>

                {temporaryImage === null ? (
                  <div
                    tabIndex={0}
                    className="flex min-h-72 items-center justify-center rounded-md border border-stone-200 bg-white p-6 text-center text-sm text-stone-500 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  >
                    Image preview will appear here. You can paste an image here.
                  </div>
                ) : (
                  <div className="rounded-md border border-stone-200 bg-white p-3">
                    <div className="relative min-h-72 overflow-hidden rounded-md bg-stone-100">
                      <Image src={temporaryImage.previewUrl} alt="Selected recipe source preview" fill className="object-contain" unoptimized />
                    </div>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
                      <span>{temporaryImage.file.name}</span>
                      <button
                        type="button"
                        onClick={() => setImage(undefined)}
                        className="rounded-md border border-stone-300 px-3 py-2 font-semibold text-stone-800"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
              <h2 className="text-lg font-semibold text-stone-900">Extraction</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{statusText(status)}</p>
              {status === 'extracting' ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-amber-950">
                    <span>{progressText(elapsedSeconds)}</span>
                    <span>{elapsedSeconds}s</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-500" />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-amber-900">
                    Keep this tab open. The draft will appear below when validation succeeds.
                  </p>
                </div>
              ) : null}
              {extractError === null ? null : (
                <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {extractError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleExtract()}
                disabled={!canExtract || status === 'extracting'}
                className="mt-4 h-11 w-full rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Extract recipe
              </button>
            </div>

            <div className="rounded-md border border-stone-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-stone-900">Draft review</h2>
              {draftRecipe !== null ? (
                <div className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
                  <p className="font-medium text-stone-900">Draft ready for review</p>
                  <p>Review and edit the structured draft below before saving it to your local recipe library.</p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Extraction results will appear here. Raw pasted text or images are not saved with the final recipe by default.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {draftRecipe === null ? null : <ReviewDraft recipe={draftRecipe} />}
    </section>
  );
}
