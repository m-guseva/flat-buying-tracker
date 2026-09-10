import { describe, it, expect } from 'vitest';
import { parseManualApartmentForm, parseApartmentPropertiesForm } from '@/lib/apartments/formData';

describe('parseManualApartmentForm', () => {
  it('parses filled fields', () => {
    const formData = new FormData();
    formData.set('title', 'Nice flat');
    formData.set('address', 'Müllerstraße 42');
    formData.set('price', '425000');
    formData.set('livingArea', '58.5');
    formData.set('rooms', '2.5');

    const input = parseManualApartmentForm(formData);

    expect(input).toEqual({
      source: 'MANUAL',
      title: 'Nice flat',
      address: 'Müllerstraße 42',
      price: 425000,
      livingArea: 58.5,
      rooms: 2.5,
    });
  });

  it('omits empty fields instead of coercing to 0 or empty string', () => {
    const input = parseManualApartmentForm(new FormData());

    expect(input).toEqual({ source: 'MANUAL' });
  });
});

describe('parseApartmentPropertiesForm', () => {
  it('parses all property fields including booleans', () => {
    const formData = new FormData();
    formData.set('title', 'Updated title');
    formData.set('floor', '3');
    formData.set('balcony', 'true');
    formData.set('elevator', 'false');
    formData.set('locationRating', '4');
    formData.set('maklerprovisionPercent', '3.57');

    const input = parseApartmentPropertiesForm(formData);

    expect(input).toEqual({
      title: 'Updated title',
      floor: '3',
      balcony: true,
      elevator: false,
      locationRating: 4,
      maklerprovisionPercent: 3.57,
    });
  });

  it('omits fields left blank', () => {
    const input = parseApartmentPropertiesForm(new FormData());
    expect(input).toEqual({});
  });
});
