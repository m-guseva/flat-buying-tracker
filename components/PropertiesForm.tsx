'use client';

import { useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Apartment } from '@prisma/client';
import { updateApartmentPropertiesAction } from '@/app/actions/apartments';

export function PropertiesForm({
  apartment,
  formId,
  isModal,
}: {
  apartment: Apartment;
  formId: string;
  isModal: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await updateApartmentPropertiesAction(apartment.id, formData);
      // In the overlay, back() closes it and returns to wherever it was
      // opened from, preserving the home page's search/filter/sort state.
      // On the full page (e.g. right after manually creating an
      // apartment, which redirects here without ever opening the
      // overlay), back() has no reliable "previous" to return to, so
      // navigate home explicitly instead.
      if (isModal) {
        router.back();
      } else {
        router.push('/');
      }
    });
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-8">
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
    </form>
  );
}
