'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatEuros } from '@/lib/format';

export default function DepositActions({ booking }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captureEur, setCaptureEur] = useState('');

  async function call(path, body) {
    setLoading(true);
    setError(null);
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Erreur');
      return false;
    }
    router.refresh();
    return true;
  }

  if (booking.deposit_status === 'none') {
    return (
      <div>
        <p className="text-sm text-slate-600 mb-2">
          Caution de {formatEuros(booking.deposit_amount)} pas encore demandée au client.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            if (await call('/api/deposits/authorize', { booking_id: booking.id })) {
              alert(
                'Caution préparée. Envoyez au client le lien:\n' +
                  `${window.location.origin}/bookings/${booking.id}/deposit`
              );
            }
          }}
          className="bg-brand-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          Demander la caution
        </button>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  if (booking.deposit_status === 'authorized') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Caution autorisée : {formatEuros(booking.deposit_amount)}. À la fin du séjour :
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => call('/api/deposits/release', { booking_id: booking.id })}
            className="border border-slate-300 px-3 py-1.5 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Libérer la caution
          </button>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              max={booking.deposit_amount / 100}
              placeholder="Montant €"
              value={captureEur}
              onChange={(e) => setCaptureEur(e.target.value)}
              className="w-32 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={loading || !captureEur}
              onClick={() => {
                const cents = Math.round(Number(captureEur) * 100);
                if (cents > 0) {
                  call('/api/deposits/capture', {
                    booking_id: booking.id,
                    amount_to_capture: cents,
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-50"
            >
              Prélever ce montant
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-500">
      Statut final : {booking.deposit_status}.
    </p>
  );
}
