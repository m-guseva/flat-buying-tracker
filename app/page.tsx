import { listApartments } from '@/lib/db/apartments';
import { ApartmentBrowser } from '@/components/ApartmentBrowser';

export default async function HomePage() {
  const apartments = await listApartments();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Flat Buying Tracker</h1>
      <ApartmentBrowser apartments={apartments} />
    </main>
  );
}
