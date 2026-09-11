import { prisma } from './client';
import { fileStorage } from '../storage/fileStorage';
import type { Apartment } from '@prisma/client';

export type Status =
  | 'NOT_CONTACTED'
  | 'CONTACTED'
  | 'RECEIVED_EXPOSE'
  | 'SETUP_VIEWING'
  | 'POST_VIEWING'
  | 'INTEREST_FOR_PURCHASE';

export type MaklervertragStatus = 'NOT_RECEIVED' | 'RECEIVED' | 'SIGNED' | 'WIDERRUF';

export type CreateApartmentInput = {
  title?: string;
  source: 'IMMOSCOUT24' | 'IMMOWELT' | 'MANUAL' | 'OTHER';
  sourceUrl?: string;
  address?: string;
  price?: number;
  livingArea?: number;
  rooms?: number;
  floor?: string;
  balcony?: boolean;
  elevator?: boolean;
  kitchen?: boolean;
  condition?: string;
  energieausweis?: string;
  hausgeld?: number;
  maklerprovisionPercent?: number;
};

export type UpdateApartmentInput = Partial<CreateApartmentInput> & {
  locationRating?: number;
  personalRating?: number;
  maklervertragStatus?: MaklervertragStatus;
  notes?: string;
};

export async function createApartment(input: CreateApartmentInput): Promise<Apartment> {
  return prisma.apartment.create({
    data: {
      ...input,
      statusHistory: {
        create: { status: 'NOT_CONTACTED' },
      },
    },
  });
}

export async function getApartment(id: string) {
  return prisma.apartment.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: 'asc' } },
      documents: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      statusHistory: { orderBy: [{ timestamp: 'desc' }, { id: 'desc' }] },
    },
  });
}

export async function listApartments() {
  return prisma.apartment.findMany({
    include: {
      images: { orderBy: { order: 'asc' } },
      documents: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

export async function updateApartment(id: string, data: UpdateApartmentInput) {
  return prisma.apartment.update({ where: { id }, data });
}

export async function updateApartmentStatus(id: string, status: Status) {
  const [apartment] = await prisma.$transaction([
    prisma.apartment.update({ where: { id }, data: { status } }),
    prisma.statusHistory.create({ data: { apartmentId: id, status } }),
  ]);
  return apartment;
}

export async function deleteApartment(id: string) {
  const apartment = await prisma.apartment.delete({ where: { id } });
  await fileStorage.deleteAll(id);
  return apartment;
}

export async function findApartmentBySourceUrl(sourceUrl: string) {
  return prisma.apartment.findFirst({ where: { sourceUrl } });
}
