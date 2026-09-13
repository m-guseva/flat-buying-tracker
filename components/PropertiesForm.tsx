'use client';

import { useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Apartment, ProConItem } from '@prisma/client';
import { updateApartmentPropertiesAction } from '@/app/actions/apartments';
import { calculateMaklerFee, formatPrice } from '@/lib/apartments/format';
import { isReadOnly } from '@/lib/readOnly';
import { ENERGIEAUSWEIS_GRADES } from '@/lib/apartments/fields';
import { ProConEditor } from '@/components/ProConEditor';

export function PropertiesForm({
  apartment,
  proCons,
  formId,
  isModal,
}: {
  apartment: Apartment;
  proCons: ProConItem[];
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
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <fieldset disabled={isReadOnly()} className="space-y-6">
        <section className="glass-panel p-4 space-y-3">
          <h2 className="text-lg font-medium">Basic</h2>
          <label className="block text-sm">
            Title
            <input name="title" defaultValue={apartment.title ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Listing URL
            <input
              name="sourceUrl"
              type="url"
              placeholder="https://…"
              defaultValue={apartment.sourceUrl ?? ''}
              className="glass-input block w-full mt-1"
            />
          </label>
          <label className="block text-sm">
            Address
            <input name="address" defaultValue={apartment.address ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Price
            <input name="price" type="number" defaultValue={apartment.price ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Living area (m²)
            <input name="livingArea" type="number" step="0.1" defaultValue={apartment.livingArea ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Rooms
            <input name="rooms" type="number" step="0.5" defaultValue={apartment.rooms ?? ''} className="glass-input block w-full mt-1" />
          </label>
        </section>

        <section className="glass-panel p-4 space-y-3">
          <h2 className="text-lg font-medium">Property characteristics</h2>
          <label className="block text-sm">
            Floor
            <input name="floor" defaultValue={apartment.floor ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Balcony / terrace
            <select name="balcony" defaultValue={apartment.balcony == null ? '' : String(apartment.balcony)} className="glass-input block w-full mt-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block text-sm">
            Elevator
            <select name="elevator" defaultValue={apartment.elevator == null ? '' : String(apartment.elevator)} className="glass-input block w-full mt-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block text-sm">
            Kitchen
            <select name="kitchen" defaultValue={apartment.kitchen == null ? '' : String(apartment.kitchen)} className="glass-input block w-full mt-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block text-sm">
            Condition
            <input name="condition" defaultValue={apartment.condition ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Energieausweis
            <select name="energieausweis" defaultValue={apartment.energieausweis ?? ''} className="glass-input block w-full mt-1">
              <option value="">Unknown</option>
              {ENERGIEAUSWEIS_GRADES.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Hausgeld
            <input name="hausgeld" type="number" defaultValue={apartment.hausgeld ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Maklerprovision %
            <input
              name="maklerprovisionPercent"
              type="number"
              step="0.01"
              defaultValue={apartment.maklerprovisionPercent ?? ''}
              className="glass-input block w-full mt-1"
            />
          </label>
          <p className="text-sm text-gray-500 dark:text-white/40">
            Makler fee: {formatPrice(calculateMaklerFee(apartment.price, apartment.maklerprovisionPercent)) ?? '—'}
          </p>
        </section>

        <section className="glass-panel p-4 space-y-3">
          <h2 className="text-lg font-medium">Location / evaluation</h2>
          <label className="block text-sm">
            Location rating (1-5)
            <input name="locationRating" type="number" min={1} max={5} defaultValue={apartment.locationRating ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <label className="block text-sm">
            Personal rating (1-5)
            <input name="personalRating" type="number" min={1} max={5} defaultValue={apartment.personalRating ?? ''} className="glass-input block w-full mt-1" />
          </label>
          <ProConEditor apartmentId={apartment.id} items={proCons} />
        </section>
      </fieldset>
    </form>
  );
}
