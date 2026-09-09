import { listApartments } from '@/lib/db/apartments';
import { ApartmentCard } from '@/components/ApartmentCard';
import { AddApartmentCard } from '@/components/AddApartmentCard';

export default async function HomePage() {
  const apartments = await listApartments();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Flat Buying Tracker</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AddApartmentCard />
        {apartments.map((apartment) => (
          <ApartmentCard key={apartment.id} apartment={apartment} />
        ))}
      </div>
    </main>
  );
}
