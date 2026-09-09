import { notFound } from 'next/navigation';
import { getApartment } from '@/lib/db/apartments';
import { Modal } from '@/components/Modal';
import { ApartmentDetailContent } from '@/components/ApartmentDetailContent';

export default async function ApartmentModal({ params }: { params: { id: string } }) {
  const apartment = await getApartment(params.id);
  if (!apartment) notFound();

  return (
    <Modal>
      <ApartmentDetailContent apartment={apartment} isModal />
    </Modal>
  );
}
