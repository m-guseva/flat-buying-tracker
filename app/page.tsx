import { listApartments } from '@/lib/db/apartments';
import { ApartmentBrowser } from '@/components/ApartmentBrowser';

export default async function HomePage() {
  const apartments = await listApartments();

  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6 accent-text">
        Flat Buying Tracker
      </h1>
      <ApartmentBrowser apartments={apartments} />
    </main>
  );
}
