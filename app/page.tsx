import Link from 'next/link';
import { listApartments } from '@/lib/db/apartments';
import { ApartmentCard } from '@/components/ApartmentCard';

export default async function HomePage() {
  const apartments = await listApartments();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Flat Buying Tracker</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Link
          href="/apartments/new"
          className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 aspect-[4/3] text-gray-500 hover:border-gray-400"
        >
          <span className="text-3xl">+</span>
          <span className="font-medium">Add apartment</span>
          <span className="text-sm">Paste or drop a link</span>
        </Link>
        {apartments.map((apartment) => (
          <ApartmentCard key={apartment.id} apartment={apartment} />
        ))}
      </div>
    </main>
  );
}
