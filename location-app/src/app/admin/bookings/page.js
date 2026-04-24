import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatEuros, formatDate } from '@/lib/format';
import DepositActions from './DepositActions';

export const revalidate = 0;

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
  disputed: 'Litige',
};

const DEPOSIT_LABELS = {
  none: 'Non demandée',
  authorized: 'Autorisée',
  captured: 'Prélevée',
  released: 'Libérée',
  expired: 'Expirée',
};

export default async function AdminBookingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, properties!inner(title, host_id)')
    .eq('properties.host_id', user.id)
    .order('check_in', { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Réservations</h1>

      <div className="space-y-4">
        {bookings && bookings.length > 0 ? (
          bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{b.properties?.title}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.nights} nuit(s) · {b.guest_count} voyageur(s)
                  </div>
                  <div className="text-sm mt-2">
                    Total : <strong>{formatEuros(b.total_amount)}</strong> · Caution :{' '}
                    {formatEuros(b.deposit_amount)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100">
                    Séjour : {STATUS_LABELS[b.status] || b.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100">
                    Caution : {DEPOSIT_LABELS[b.deposit_status] || b.deposit_status}
                  </span>
                </div>
              </div>
              {b.status === 'confirmed' && b.deposit_amount > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <DepositActions booking={b} />
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-slate-600">Aucune réservation pour le moment.</p>
        )}
      </div>
    </div>
  );
}
