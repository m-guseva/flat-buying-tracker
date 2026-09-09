import type { Apartment, Document as ApartmentDocument, Image as ApartmentImage, StatusHistory } from '@prisma/client';
import { STATUS_LABELS, MAKLERVERTRAG_LABELS, SOURCE_LABELS } from '@/lib/apartments/format';
import { updateApartmentStatusAction, updateApartmentMaklervertragAction } from '@/app/actions/apartments';
import { deleteDocumentAction } from '@/app/actions/documents';
import { DocumentDropzone } from '@/components/DocumentDropzone';
import { ImportRetryDropzone } from '@/components/ImportRetryDropzone';
import { NotesEditor } from '@/components/NotesEditor';
import { ImageCarousel } from '@/components/ImageCarousel';
import { PropertiesForm } from '@/components/PropertiesForm';

type ApartmentWithRelations = Apartment & {
  images: ApartmentImage[];
  documents: ApartmentDocument[];
  statusHistory: StatusHistory[];
};

const PROPERTIES_FORM_ID = 'apartment-properties-form';

export function ApartmentDetailContent({
  apartment,
  isModal,
}: {
  apartment: ApartmentWithRelations;
  isModal: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
        <ImageCarousel images={apartment.images} alt={apartment.title ?? 'Apartment'} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {apartment.title ?? apartment.address ?? 'Untitled apartment'}
        </h1>
        {apartment.sourceUrl && (
          <p className="text-sm text-gray-500 mt-1">
            Source: {SOURCE_LABELS[apartment.source] ?? apartment.source}
            {' — '}
            <a href={apartment.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600">
              Open original listing ↗
            </a>
          </p>
        )}
      </div>

      {apartment.source !== 'MANUAL' && !apartment.title && apartment.images.length === 0 && (
        <ImportRetryDropzone apartmentId={apartment.id} />
      )}

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

      <PropertiesForm apartment={apartment} formId={PROPERTIES_FORM_ID} isModal={isModal} />

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

      <button type="submit" form={PROPERTIES_FORM_ID} className="w-full px-4 py-2 bg-black text-white rounded">
        Save
      </button>
    </div>
  );
}
