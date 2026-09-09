import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createImageMock = vi.fn();
vi.mock('@/lib/db/images', () => ({
  createImage: (...args: unknown[]) => createImageMock(...args),
}));

import { downloadAndStoreImages } from '@/lib/ingestion/downloadAndStoreImages';

function mockResponse(body: string, ok = true): Response {
  return new Response(body, { status: ok ? 200 : 500 });
}

describe('downloadAndStoreImages', () => {
  beforeEach(() => {
    createImageMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads each image in order and stores it with a sequential order index', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse('image-a'))
      .mockResolvedValueOnce(mockResponse('image-b'));
    vi.stubGlobal('fetch', fetchMock);

    await downloadAndStoreImages('apartment-1', ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg']);

    expect(createImageMock).toHaveBeenCalledTimes(2);
    expect(createImageMock.mock.calls[0]).toEqual(['apartment-1', Buffer.from('image-a'), 'photo-1.jpg', 0]);
    expect(createImageMock.mock.calls[1]).toEqual(['apartment-1', Buffer.from('image-b'), 'photo-2.jpg', 1]);
  });

  it('skips a failed download and keeps the next successful image contiguous', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(mockResponse('image-b'));
    vi.stubGlobal('fetch', fetchMock);

    await downloadAndStoreImages('apartment-1', ['https://cdn.example.com/broken.jpg', 'https://cdn.example.com/b.jpg']);

    expect(createImageMock).toHaveBeenCalledTimes(1);
    expect(createImageMock.mock.calls[0]).toEqual(['apartment-1', Buffer.from('image-b'), 'photo-1.jpg', 0]);
  });

  it('skips a non-OK response without throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockResponse('', false));
    vi.stubGlobal('fetch', fetchMock);

    await downloadAndStoreImages('apartment-1', ['https://cdn.example.com/missing.jpg']);

    expect(createImageMock).not.toHaveBeenCalled();
  });
});
