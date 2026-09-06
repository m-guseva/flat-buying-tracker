import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Readable } from 'stream';

const readMock = vi.fn();

vi.mock('@/lib/storage/fileStorage', () => ({
  fileStorage: {
    read: (...args: unknown[]) => readMock(...args),
    delete: vi.fn(),
    save: vi.fn(),
  },
}));

// Imported after the mock so the route picks up the mocked fileStorage.
const { GET } = await import('@/app/api/files/[...path]/route');

function makeRequest(pathname: string) {
  return new NextRequest(new Request(`http://localhost${pathname}`));
}

describe('GET /api/files/[...path]', () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it('rejects a traversal attempt made of literal ".." segments', async () => {
    const request = makeRequest('/api/files/etc/passwd');

    const response = await GET(request, { params: { path: ['..', '..', 'etc', 'passwd'] } });

    expect(response.status).toBe(404);
    expect(readMock).not.toHaveBeenCalled();
  });

  it('rejects a segment that is exactly "."', async () => {
    const request = makeRequest('/api/files/./passwd');

    const response = await GET(request, { params: { path: ['.', 'passwd'] } });

    expect(response.status).toBe(404);
    expect(readMock).not.toHaveBeenCalled();
  });

  it('rejects a single segment smuggling an embedded slash (decoded ../..)', async () => {
    // Represents what a segment looks like after Next.js decodes a URL like
    // /api/files/..%2F..%2Fetc%2Fpasswd into params.path — one opaque segment
    // that, once decoded, contains "/" and would let path.join() in
    // fileStorage escape STORAGE_ROOT if it ever reached fileStorage.read.
    const request = makeRequest('/api/files/..%2F..%2Fetc%2Fpasswd');

    const response = await GET(request, { params: { path: ['../../etc/passwd'] } });

    expect(response.status).toBe(404);
    expect(readMock).not.toHaveBeenCalled();
  });

  it('serves a legitimate <apartmentId>/<filename> reference', async () => {
    readMock.mockResolvedValue(Readable.from([Buffer.from('file contents')]));
    const request = makeRequest('/api/files/apartment-1/photo.jpg');

    const response = await GET(request, { params: { path: ['apartment-1', 'photo.jpg'] } });

    expect(response.status).toBe(200);
    expect(readMock).toHaveBeenCalledWith('apartment-1/photo.jpg');
    expect(await response.text()).toBe('file contents');
  });
});
