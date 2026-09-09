import { createImage } from '@/lib/db/images';

export async function downloadAndStoreImages(apartmentId: string, imageUrls: string[]): Promise<void> {
  let order = 0;
  for (const url of imageUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      await createImage(apartmentId, buffer, `photo-${order + 1}.jpg`, order);
      order += 1;
    } catch {
      // one failed image download must not block the others or the apartment
    }
  }
}
