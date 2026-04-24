import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatEuros, formatDate } from '@/lib/format';

export const revalidate = 0;

const STATUS_LABELS = {
  pending: 'En attente de paiement',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
  disputed: 'Litige',
};

export default async function AccountBookingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, properties(title, city)')
    .eq('guest_id', user.id)
    .order('check_in', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Mes réservations</h1>

      {bookings && bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <div className="font-semibold text-lg">{b.properties?.title}</div>
                  <div className="text-sm text-slate-600">{b.properties?.city}</div>
                  <div className="text-sm mt-2">
                    Du {formatDate(b.check_in)} au {formatDate(b.check_out)} ({b.nights} nuit·s)
                  </div>
                  <div className="text-sm mt-1">
                    Total payé : <strong>{formatEuros(b.total_amount)}</strong>
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 text-xs">
                  {STATUS_LABELS[b.status] || b.status}
                </span>
              </div>
              {b.deposit_amount > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
                  Caution : {formatEuros(b.deposit_amount)} — statut : <strong>{b.deposit_status}</strong>
                  {b.stripe_deposit_intent_id && b.deposit_status === 'none' && (
                    <>
                      {' · '}
                      <Link
                        href={`/bookings/${b.id}/deposit`}
                        className="text-brand-600 hover:underline"
                      >
                        Autoriser la caution
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-600">
          Vous n'avez pas encore réservé.{' '}
          <Link href="/" className="text-brand-600 hover:underline">
            Découvrir les logements
          </Link>
        </div>
      )}
    </div>
  );
}
