import { listRecipes } from '@/lib/db/repositories';
import { recipeExportSlug, recipeToMarkdown } from '@/lib/export/recipeMarkdown';
import { createZipBlob } from '@/lib/export/zip';

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportRecipesZip(): Promise<number> {
  const recipes = await listRecipes();
  const stamp = dateStamp();
  const entries = [
    {
      path: 'cookagent-backup.json',
      content: `${JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          schema: 'cookagent-recipes-v1',
          recipes,
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'README.md',
      content: [
        '# Cookagent export',
        '',
        `Exported at: ${new Date().toISOString()}`,
        '',
        '- `cookagent-backup.json` is the complete machine-readable backup.',
        '- `recipes/*.md` contains one human-readable Markdown file per recipe.',
        '',
      ].join('\n'),
    },
    ...recipes.map((recipe) => ({
      path: `recipes/${recipeExportSlug(recipe)}.md`,
      content: recipeToMarkdown(recipe),
    })),
  ];

  downloadBlob(createZipBlob(entries), `cookagent-export-${stamp}.zip`);

  return recipes.length;
}
