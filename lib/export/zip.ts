interface ZipEntryInput {
  path: string;
  content: string;
}

interface EncodedEntry {
  pathBytes: Uint8Array;
  contentBytes: Uint8Array;
  crc32: number;
  localHeaderOffset: number;
}

const encoder = new TextEncoder();
const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let current = index;

  for (let bit = 0; bit < 8; bit += 1) {
    current = (current & 1) === 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }

  crcTable[index] = current >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { date: number; time: number } {
  const year = Math.max(date.getFullYear(), 1980);

  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function writeUint16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function localHeader(entry: EncodedEntry, timestamp: { date: number; time: number }): Uint8Array {
  const header = new Uint8Array(30 + entry.pathBytes.length);

  writeUint32(header, 0, 0x04034b50);
  writeUint16(header, 4, 20);
  writeUint16(header, 6, 0x0800);
  writeUint16(header, 8, 0);
  writeUint16(header, 10, timestamp.time);
  writeUint16(header, 12, timestamp.date);
  writeUint32(header, 14, entry.crc32);
  writeUint32(header, 18, entry.contentBytes.length);
  writeUint32(header, 22, entry.contentBytes.length);
  writeUint16(header, 26, entry.pathBytes.length);
  writeUint16(header, 28, 0);
  header.set(entry.pathBytes, 30);

  return header;
}

function centralDirectoryHeader(entry: EncodedEntry, timestamp: { date: number; time: number }): Uint8Array {
  const header = new Uint8Array(46 + entry.pathBytes.length);

  writeUint32(header, 0, 0x02014b50);
  writeUint16(header, 4, 20);
  writeUint16(header, 6, 20);
  writeUint16(header, 8, 0x0800);
  writeUint16(header, 10, 0);
  writeUint16(header, 12, timestamp.time);
  writeUint16(header, 14, timestamp.date);
  writeUint32(header, 16, entry.crc32);
  writeUint32(header, 20, entry.contentBytes.length);
  writeUint32(header, 24, entry.contentBytes.length);
  writeUint16(header, 28, entry.pathBytes.length);
  writeUint16(header, 30, 0);
  writeUint16(header, 32, 0);
  writeUint16(header, 34, 0);
  writeUint16(header, 36, 0);
  writeUint32(header, 38, 0);
  writeUint32(header, 42, entry.localHeaderOffset);
  header.set(entry.pathBytes, 46);

  return header;
}

function endOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Uint8Array {
  const header = new Uint8Array(22);

  writeUint32(header, 0, 0x06054b50);
  writeUint16(header, 4, 0);
  writeUint16(header, 6, 0);
  writeUint16(header, 8, entryCount);
  writeUint16(header, 10, entryCount);
  writeUint32(header, 12, centralDirectorySize);
  writeUint32(header, 16, centralDirectoryOffset);
  writeUint16(header, 20, 0);

  return header;
}

export function createZipBlob(entries: ZipEntryInput[]): Blob {
  const timestamp = dosDateTime(new Date());
  const encodedEntries: EncodedEntry[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const pathBytes = encoder.encode(entry.path.replace(/\\/g, '/'));
    const contentBytes = encoder.encode(entry.content);
    const encodedEntry: EncodedEntry = {
      pathBytes,
      contentBytes,
      crc32: crc32(contentBytes),
      localHeaderOffset: offset,
    };
    const header = localHeader(encodedEntry, timestamp);

    chunks.push(header, contentBytes);
    offset += header.length + contentBytes.length;
    encodedEntries.push(encodedEntry);
  }

  const centralDirectoryOffset = offset;

  for (const entry of encodedEntries) {
    const header = centralDirectoryHeader(entry, timestamp);

    chunks.push(header);
    offset += header.length;
  }

  chunks.push(endOfCentralDirectory(encodedEntries.length, offset - centralDirectoryOffset, centralDirectoryOffset));

  return new Blob(chunks, { type: 'application/zip' });
}
