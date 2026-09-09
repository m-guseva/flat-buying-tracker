import type { Apartment, Document } from '@prisma/client';

type ApartmentWithDocuments = Apartment & { documents: Pick<Document, 'filename'>[] };

export function matchesSearch(apartment: ApartmentWithDocuments, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const haystacks = [
    apartment.address,
    apartment.title,
    apartment.notes,
    apartment.source,
    ...apartment.documents.map((document) => document.filename),
  ];

  return haystacks.some((value) => value != null && value.toLowerCase().includes(trimmed));
}
