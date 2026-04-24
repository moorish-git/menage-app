'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { formatEuros, nightsBetween } from '@/lib/format';

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function disabledRangesFromBookings(bookings) {
  return (bookings || []).map((b) => ({
    from: parseDate(b.check_in),
    to: parseDate(b.check_out),
  }));
}

export default function BookingForm({ property, busyBookings, hasUser }) {
  const router = useRouter();
  const [range, setRange] = useState();
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const disabled = useMemo(
    () => [{ before: new Date() }, ...disabledRangesFromBookings(busyBookings)],
    [busyBookings]
  );

  const nights = range?.from && range?.to ? nightsBetween(range.from, range.to) : 0;
  const subtotal = nights * property.price_per_night;
  const total = subtotal + (property.cleaning_fee || 0);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!hasUser) {
      router.push(`/login?next=/properties/${property.id}`);
      return;
    }

    if (!range?.from || !range?.to) {
      setError('Sélectionnez une date d\'arrivée et de départ.');
      return;
    }
    if (nights < 1) {
      setError('La durée doit être d\'au moins 1 nuit.');
      return;
    }
    if (guests < 1 || guests > property.max_guests) {
      setError(`Le nombre de voyageurs doit être entre 1 et ${property.max_guests}.`);
      return;
    }

    setLoading(true);

    const payload = {
      property_id: property.id,
      check_in: formatDateForApi(range.from),
      check_out: formatDateForApi(range.to),
      guest_count: guests,
    };

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Une erreur est survenue.');
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white p-5 rounded-lg border border-slate-200 sticky top-6"
    >
      <div className="text-lg font-semibold mb-3">
        {formatEuros(property.price_per_night)}{' '}
        <span className="text-sm font-normal text-slate-500">/ nuit</span>
      </div>

      <DayPicker
        mode="range"
        selected={range}
        onSelect={setRange}
        disabled={disabled}
        numberOfMonths={1}
        className="mb-4"
      />

      <label className="block text-sm font-medium mb-1">Voyageurs</label>
      <input
        type="number"
        min={1}
        max={property.max_guests}
        value={guests}
        onChange={(e) => setGuests(Number(e.target.value))}
        className="w-full border border-slate-300 rounded-md px-3 py-2 mb-4"
      />

      {nights > 0 && (
        <div className="text-sm space-y-1 mb-4 pt-4 border-t border-slate-200">
          <div className="flex justify-between">
            <span>
              {formatEuros(property.price_per_night)} × {nights} nuit(s)
            </span>
            <span>{formatEuros(subtotal)}</span>
          </div>
          {property.cleaning_fee > 0 && (
            <div className="flex justify-between">
              <span>Frais de ménage</span>
              <span>{formatEuros(property.cleaning_fee)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-2 border-t border-slate-200">
            <span>Total</span>
            <span>{formatEuros(total)}</span>
          </div>
          {property.deposit_amount > 0 && (
            <p className="text-xs text-slate-500 pt-2">
              Caution : {formatEuros(property.deposit_amount)} (autorisée sur votre carte, non débitée sauf dégâts).
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={loading || nights < 1}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-md disabled:opacity-50"
      >
        {loading ? 'Redirection…' : hasUser ? 'Réserver et payer' : 'Se connecter pour réserver'}
      </button>
    </form>
  );
}

function formatDateForApi(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
