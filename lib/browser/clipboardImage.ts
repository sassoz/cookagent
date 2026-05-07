export function imageFileFromClipboard(event: React.ClipboardEvent): File | null {
  const items = Array.from(event.clipboardData.items);
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  const file = imageItem?.getAsFile();

  if (file === undefined || file === null) {
    return null;
  }

  const extension = file.type.split('/')[1] ?? 'png';

  return new File([file], file.name || `clipboard-image.${extension}`, { type: file.type });
}
