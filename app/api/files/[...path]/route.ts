import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import path from 'path';
import { fileStorage } from '@/lib/storage/fileStorage';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  if (params.path.some((segment) => segment === '..' || segment === '.' || segment.includes('/'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const reference = params.path.join('/');
  const download = request.nextUrl.searchParams.get('download') === '1';

  try {
    const stream = await fileStorage.read(reference);
    const webStream = Readable.toWeb(stream) as ReadableStream;
    const headers = new Headers();
    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${path.basename(reference)}"`);
    }
    return new NextResponse(webStream, { headers });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
