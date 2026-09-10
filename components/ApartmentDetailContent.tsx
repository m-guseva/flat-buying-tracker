import type { Apartment, Document as ApartmentDocument, Image as ApartmentImage, StatusHistory } from '@prisma/client';
import { STATUS_LABELS, MAKLERVERTRAG_LABELS, SOURCE_LABELS } from '@/lib/apartments/format';
import { updateApartmentStatusAction, updateApartmentMaklervertragAction } from '@/app/actions/apartments';
import { deleteDocumentAction } from '@/app/actions/documents';
import { DocumentDropzone } from '@/components/DocumentDropzone';
import { ImportRetryDropzone } from '@/components/ImportRetryDropzone';
import { NotesEditor } from '@/components/NotesEditor';
import { ImageCarousel } from '@/components/ImageCarousel';
import { PasteImageZone } from '@/components/PasteImageZone';
import { PropertiesForm } from '@/components/PropertiesForm';
import { isReadOnly } from '@/lib/readOnly';

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
  const readOnly = isReadOnly();
  return (
    <div className="space-y-8">
      <div>
        <div className="aspect-[4/3] bg-white/40 rounded-2xl overflow-hidden border border-white/60 shadow-lg shadow-indigo-100/50">
          <ImageCarousel apartmentId={apartment.id} images={apartment.images} alt={apartment.title ?? 'Apartment'} allowSetCover={!readOnly} />
        </div>
        <PasteImageZone apartmentId={apartment.id} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {apartment.title ?? apartment.address ?? 'Untitled apartment'}
        </h1>
        {apartment.sourceUrl && (
          <p className="text-sm text-gray-500 mt-1">
            Source: {SOURCE_LABELS[apartment.source] ?? apartment.source}
            {' — '}
            <a href={apartment.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700">
              Open original listing ↗
            </a>
          </p>
        )}
      </div>

      {apartment.source !== 'MANUAL' && !apartment.title && apartment.images.length === 0 && !readOnly && (
        <ImportRetryDropzone apartmentId={apartment.id} />
      )}

      <section className="glass-panel p-4 space-y-3">
        <h2 className="text-lg font-medium">Process / status</h2>
        <form action={updateApartmentStatusAction.bind(null, apartment.id)} className="flex gap-2">
          <fieldset disabled={readOnly} className="flex gap-2">
            <select name="status" defaultValue={apartment.status} className="glass-input">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="submit" className="btn-secondary">Update status</button>
          </fieldset>
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

      <section className="glass-panel p-4 space-y-3">
        <h2 className="text-lg font-medium">Maklervertrag</h2>
        <form action={updateApartmentMaklervertragAction.bind(null, apartment.id)} className="flex gap-2">
          <fieldset disabled={readOnly} className="flex gap-2">
            <select name="maklervertragStatus" defaultValue={apartment.maklervertragStatus} className="glass-input">
              {Object.entries(MAKLERVERTRAG_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="submit" className="btn-secondary">Update</button>
          </fieldset>
        </form>
      </section>

      <PropertiesForm apartment={apartment} formId={PROPERTIES_FORM_ID} isModal={isModal} />

      <section className="glass-panel p-4 space-y-3">
        <h2 className="text-lg font-medium">Documents</h2>
        <ul className="space-y-2 text-sm">
          {apartment.documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 bg-white/60 border border-white/70 rounded-lg px-3 py-2">
              <span>📄 {document.filename}</span>
              <span className="text-gray-400">Added {document.createdAt.toLocaleDateString('de-DE')}</span>
              <a href={`/api/files/${document.filePath}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700">
                Open
              </a>
              <a
                href={`/api/files/${document.filePath}?download=1&filename=${encodeURIComponent(document.filename)}`}
                className="text-indigo-600 hover:text-indigo-700"
              >
                Download
              </a>
              {!readOnly && (
                <form action={deleteDocumentAction.bind(null, apartment.id, document.id)}>
                  <button type="submit" className="text-red-600 hover:text-red-700">Delete</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && <DocumentDropzone apartmentId={apartment.id} />}
      </section>

      <section className="glass-panel p-4 space-y-3">
        <h2 className="text-lg font-medium">Notes</h2>
        <NotesEditor apartmentId={apartment.id} initialNotes={apartment.notes ?? ''} />
      </section>

      {!readOnly && (
        <button type="submit" form={PROPERTIES_FORM_ID} className="btn-primary w-full">
          Save
        </button>
      )}
    </div>
  );
}
