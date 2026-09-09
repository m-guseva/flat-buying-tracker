import { createManualApartmentAction } from '@/app/actions/apartments';

export default function NewApartmentPage() {
  return (
    <main className="max-w-lg mx-auto p-6">
      <div className="glass-panel p-6 space-y-4">
        <h1 className="text-xl font-semibold">Add apartment manually</h1>
        <form action={createManualApartmentAction} className="space-y-3">
          <label className="block text-sm">
            Title
            <input name="title" type="text" className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Address
            <input name="address" type="text" className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Price (EUR)
            <input name="price" type="number" step="1" className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Living area (m²)
            <input name="livingArea" type="number" step="0.1" className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Rooms
            <input name="rooms" type="number" step="0.5" className="glass-input block w-full mt-1" />
          </label>
          <button type="submit" className="btn-primary w-full">
            Create apartment
          </button>
        </form>
      </div>
    </main>
  );
}
