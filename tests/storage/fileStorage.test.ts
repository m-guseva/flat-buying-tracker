import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'fs/promises';
import path from 'path';
import { LocalFileStorage } from '@/lib/storage/fileStorage';

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk as Buffer));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const storage = new LocalFileStorage();
const apartmentId = 'test-apartment-id';

afterEach(async () => {
  await rm(path.join(process.cwd(), 'data', 'files', apartmentId), { recursive: true, force: true });
});

describe('LocalFileStorage', () => {
  it('saves and reads back a file', async () => {
    const reference = await storage.save(apartmentId, Buffer.from('hello world'), 'test.txt');

    const stream = await storage.read(reference);
    const buffer = await streamToBuffer(stream);

    expect(buffer.toString()).toBe('hello world');
  });

  it('sanitizes unsafe filenames', async () => {
    const reference = await storage.save(apartmentId, Buffer.from('data'), '../../etc/passwd');

    expect(reference).not.toContain('..');
  });

  it('deletes a saved file', async () => {
    const reference = await storage.save(apartmentId, Buffer.from('to delete'), 'delete-me.txt');

    await storage.delete(reference);

    await expect(storage.read(reference)).rejects.toThrow();
  });

  it('deletes every file for an apartment', async () => {
    const ref1 = await storage.save(apartmentId, Buffer.from('one'), 'one.txt');
    const ref2 = await storage.save(apartmentId, Buffer.from('two'), 'two.txt');

    await storage.deleteAll(apartmentId);

    await expect(storage.read(ref1)).rejects.toThrow();
    await expect(storage.read(ref2)).rejects.toThrow();
  });

  it('does not throw deleting all files for an apartment that has none', async () => {
    await expect(storage.deleteAll('apartment-with-no-files')).resolves.not.toThrow();
  });
});
