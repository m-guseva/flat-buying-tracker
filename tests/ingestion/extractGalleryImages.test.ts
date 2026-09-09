import { describe, it, expect } from 'vitest';
import { extractGalleryImages } from '@/lib/ingestion/extractGalleryImages';

describe('extractGalleryImages', () => {
  it('passes through an already-absolute src unchanged (live-fetch case)', () => {
    const url = 'https://pictures.immobilienscout24.de/listings/xyz.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80';
    expect(extractGalleryImages('', [url], 'pictures.immobilienscout24.de')).toEqual([url]);
  });

  it('resolves a relative local src by finding its UUID inside an absolute CDN URL elsewhere in the page', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `<script>{"url":"https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80"}</script>`;
    const result = extractGalleryImages(html, [`page_files/${guid}_x.jpg`], 'pictures.immobilienscout24.de');
    expect(result).toEqual([
      `https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80`,
    ]);
  });

  it('prefers the 1106x830 size variant when multiple sizes are present for the same image', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `
      <a href="https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/legacy_thumbnail/80x60/format/jpg/quality/80"></a>
      <a href="https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80"></a>
    `;
    const result = extractGalleryImages(html, [`page_files/${guid}_x.jpg`], 'pictures.immobilienscout24.de');
    expect(result[0]).toContain('1106x830');
  });

  it('drops an image whose UUID cannot be found anywhere in the page', () => {
    const result = extractGalleryImages('<html>no matches here</html>', ['page_files/no-guid-here.jpg'], 'pictures.immobilienscout24.de');
    expect(result).toEqual([]);
  });

  it('deduplicates the same image appearing twice (carousel loop-around)', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `<a href="https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=abc"></a>`;
    const srcs = [`page_files/${guid}_x.jpg`, `page_files/${guid}_x.jpg`];
    const result = extractGalleryImages(html, srcs, 'mms.immowelt.de');
    expect(result).toEqual([`https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=abc`]);
  });

  it('recovers a signed URL that cannot be reconstructed from the UUID alone', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `<a href="https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=f0bbac39e4223fdf2260b7399e829880a3ce2ec6"></a>`;
    const result = extractGalleryImages(html, [`page_files/${guid}_x.jpg`], 'mms.immowelt.de');
    expect(result).toEqual([`https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=f0bbac39e4223fdf2260b7399e829880a3ce2ec6`]);
  });
});
