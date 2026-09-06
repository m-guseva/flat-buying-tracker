import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import type { Readable } from 'stream';

const STORAGE_ROOT = path.join(process.cwd(), 'data', 'files');

export interface FileStorage {
  save(apartmentId: string, buffer: Buffer, filename: string): Promise<string>;
  read(reference: string): Promise<Readable>;
  delete(reference: string): Promise<void>;
}

function safeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export class LocalFileStorage implements FileStorage {
  async save(apartmentId: string, buffer: Buffer, filename: string): Promise<string> {
    const dir = path.join(STORAGE_ROOT, apartmentId);
    await mkdir(dir, { recursive: true });
    const unique = `${Date.now()}-${safeFilename(filename)}`;
    await writeFile(path.join(dir, unique), buffer);
    return path.join(apartmentId, unique);
  }

  async read(reference: string): Promise<Readable> {
    const filePath = path.join(STORAGE_ROOT, reference);
    await stat(filePath); // Check if file exists, throws if not
    return createReadStream(filePath);
  }

  async delete(reference: string): Promise<void> {
    await unlink(path.join(STORAGE_ROOT, reference));
  }
}

export const fileStorage: FileStorage = new LocalFileStorage();
