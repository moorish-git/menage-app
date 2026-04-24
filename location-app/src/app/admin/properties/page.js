import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatEuros } from '@/lib/format';

export const revalidate = 0;

export default async function AdminPropertiesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: properties } = await supabase
    .from('properties')
    .select('id, title, city, price_per_night, is_published')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes logements</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/bookings"
            className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50"
          >
            Voir les réservations
          </Link>
          <Link
            href="/admin/properties/new"
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md"
          >
            Ajouter un logement
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {properties && properties.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Prix / nuit</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3">{p.city}</td>
                  <td className="px-4 py-3">{formatEuros(p.price_per_night)}</td>
                  <td className="px-4 py-3">
                    {p.is_published ? (
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">
                        Publié
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/properties/${p.id}/edit`}
                      className="text-brand-600 hover:underline"
                    >
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-10 text-center text-slate-500">
            Aucun logement pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
