import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatEuros, formatDate } from '@/lib/format';

export const revalidate = 0;

export default async function BookingSuccessPage({ searchParams }) {
  const supabase = createSupabaseServerClient();
  const bookingId = searchParams?.booking_id;

  let booking = null;
  if (bookingId) {
    const { data } = await supabase
      .from('bookings')
      .select('*, properties(title, city)')
      .eq('id', bookingId)
      .single();
    booking = data;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Merci ! Votre paiement est confirmé.</h1>
      {booking ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-left mt-6">
          <p className="font-semibold text-lg">{booking.properties?.title}</p>
          <p className="text-slate-600 mt-1">{booking.properties?.city}</p>
          <dl className="mt-4 text-sm grid grid-cols-2 gap-3">
            <div>
              <dt className="text-slate-500">Arrivée</dt>
              <dd>{formatDate(booking.check_in)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Départ</dt>
              <dd>{formatDate(booking.check_out)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total payé</dt>
              <dd className="font-medium">{formatEuros(booking.total_amount)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Caution prévue</dt>
              <dd>{formatEuros(booking.deposit_amount)}</dd>
            </div>
          </dl>
          {booking.deposit_amount > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              La caution sera autorisée sur votre carte quelques jours avant l'arrivée. Elle n'est pas débitée sauf en cas de dégâts.
            </p>
          )}
        </div>
      ) : (
        <p className="text-slate-600">Vous recevrez un email de confirmation.</p>
      )}
      <Link
        href="/account/bookings"
        className="inline-block mt-8 bg-brand-600 text-white px-5 py-2.5 rounded-md hover:bg-brand-700"
      >
        Voir mes réservations
      </Link>
    </div>
  );
}
