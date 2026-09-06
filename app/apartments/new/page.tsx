import { createManualApartmentAction } from '@/app/actions/apartments';

export default function NewApartmentPage() {
  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Add apartment manually</h1>
      <form action={createManualApartmentAction} className="space-y-3">
        <label className="block">
          Title
          <input name="title" type="text" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Address
          <input name="address" type="text" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Price (EUR)
          <input name="price" type="number" step="1" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Living area (m²)
          <input name="livingArea" type="number" step="0.1" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Rooms
          <input name="rooms" type="number" step="0.5" className="block w-full border rounded px-2 py-1" />
        </label>
        <button type="submit" className="px-4 py-2 bg-black text-white rounded">
          Create apartment
        </button>
      </form>
    </main>
  );
}
