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
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect';
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
        <div className="flex gap-4">
          <div>
            <span className="block text-xs text-gray-500 mb-1">Status</span>
            <form action={updateApartmentStatusAction.bind(null, apartment.id)}>
              <fieldset disabled={readOnly}>
                <AutoSubmitSelect
                  name="status"
                  defaultValue={apartment.status}
                  options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                  className="glass-input"
                />
              </fieldset>
            </form>
          </div>
          <div>
            <span className="block text-xs text-gray-500 mb-1">Maklervertrag</span>
            <form action={updateApartmentMaklervertragAction.bind(null, apartment.id)}>
              <fieldset disabled={readOnly}>
                <AutoSubmitSelect
                  name="maklervertragStatus"
                  defaultValue={apartment.maklervertragStatus}
                  options={Object.entries(MAKLERVERTRAG_LABELS).map(([value, label]) => ({ value, label }))}
                  className="glass-input"
                />
              </fieldset>
            </form>
          </div>
        </div>
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
