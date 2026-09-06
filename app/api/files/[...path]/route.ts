import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import path from 'path';
import { fileStorage } from '@/lib/storage/fileStorage';

function sanitizeDownloadFilename(name: string): string {
  return name.replace(/[\r\n"]/g, '');
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  if (params.path.some((segment) => segment === '..' || segment === '.' || segment.includes('/'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const reference = params.path.join('/');
  const download = request.nextUrl.searchParams.get('download') === '1';
  const requestedFilename = request.nextUrl.searchParams.get('filename');

  try {
    const stream = await fileStorage.read(reference);
    const webStream = Readable.toWeb(stream) as ReadableStream;
    const headers = new Headers();
    if (download) {
      const filename = requestedFilename ? sanitizeDownloadFilename(requestedFilename) : path.basename(reference);
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }
    return new NextResponse(webStream, { headers });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
