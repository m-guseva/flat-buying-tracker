import { notFound } from 'next/navigation';
import { getApartment } from '@/lib/db/apartments';
import { STATUS_LABELS, MAKLERVERTRAG_LABELS } from '@/lib/apartments/format';
import {
  updateApartmentPropertiesAction,
  updateApartmentStatusAction,
  updateApartmentMaklervertragAction,
} from '@/app/actions/apartments';
import { deleteDocumentAction } from '@/app/actions/documents';
import { DocumentDropzone } from '@/components/DocumentDropzone';
import { NotesEditor } from '@/components/NotesEditor';

export default async function ApartmentDetailPage({ params }: { params: { id: string } }) {
  const apartment = await getApartment(params.id);
  if (!apartment) notFound();

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">
        {apartment.title ?? apartment.address ?? 'Untitled apartment'}
      </h1>

      <form action={updateApartmentPropertiesAction.bind(null, apartment.id)} className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Basic</h2>
          <label className="block">
            Title
            <input name="title" defaultValue={apartment.title ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Address
            <input name="address" defaultValue={apartment.address ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Price
            <input name="price" type="number" defaultValue={apartment.price ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Living area (m²)
            <input name="livingArea" type="number" step="0.1" defaultValue={apartment.livingArea ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Rooms
            <input name="rooms" type="number" step="0.5" defaultValue={apartment.rooms ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Property characteristics</h2>
          <label className="block">
            Floor
            <input name="floor" defaultValue={apartment.floor ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Balcony / terrace
            <select name="balcony" defaultValue={apartment.balcony == null ? '' : String(apartment.balcony)} className="block w-full border rounded px-2 py-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block">
            Elevator
            <select name="elevator" defaultValue={apartment.elevator == null ? '' : String(apartment.elevator)} className="block w-full border rounded px-2 py-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block">
            Kitchen
            <input name="kitchen" defaultValue={apartment.kitchen ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Condition
            <input name="condition" defaultValue={apartment.condition ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Hausgeld
            <input name="hausgeld" type="number" defaultValue={apartment.hausgeld ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Maklerprovision
            <input name="maklerprovision" defaultValue={apartment.maklerprovision ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Location / evaluation</h2>
          <label className="block">
            Location rating (1-5)
            <input name="locationRating" type="number" min={1} max={5} defaultValue={apartment.locationRating ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Personal rating (1-5)
            <input name="personalRating" type="number" min={1} max={5} defaultValue={apartment.personalRating ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
        </section>

        <button type="submit" className="px-4 py-2 bg-black text-white rounded">
          Save
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Process / status</h2>
        <form action={updateApartmentStatusAction.bind(null, apartment.id)} className="flex gap-2">
          <select name="status" defaultValue={apartment.status} className="border rounded px-2 py-1">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" className="px-3 py-1 border rounded">Update status</button>
        </form>

        <h3 className="text-sm font-medium text-gray-500">Status history</h3>
        <ul className="text-sm space-y-1">
          {apartment.statusHistory.map((entry) => (
            <li key={entry.id}>
              {entry.timestamp.toLocaleDateString('de-DE')} — {STATUS_LABELS[entry.status]}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Maklervertrag</h2>
        <form action={updateApartmentMaklervertragAction.bind(null, apartment.id)} className="flex gap-2">
          <select name="maklervertragStatus" defaultValue={apartment.maklervertragStatus} className="border rounded px-2 py-1">
            {Object.entries(MAKLERVERTRAG_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" className="px-3 py-1 border rounded">Update</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Documents</h2>
        <ul className="space-y-2 text-sm">
          {apartment.documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 border rounded px-3 py-2">
              <span>📄 {document.filename}</span>
              <span className="text-gray-400">Added {document.createdAt.toLocaleDateString('de-DE')}</span>
              <a href={`/api/files/${document.filePath}`} target="_blank" rel="noreferrer" className="text-blue-600">
                Open
              </a>
              <a
                href={`/api/files/${document.filePath}?download=1&filename=${encodeURIComponent(document.filename)}`}
                className="text-blue-600"
              >
                Download
              </a>
              <form action={deleteDocumentAction.bind(null, apartment.id, document.id)}>
                <button type="submit" className="text-red-600">Delete</button>
              </form>
            </li>
          ))}
        </ul>
        <DocumentDropzone apartmentId={apartment.id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Notes</h2>
        <NotesEditor apartmentId={apartment.id} initialNotes={apartment.notes ?? ''} />
      </section>
    </main>
  );
}
