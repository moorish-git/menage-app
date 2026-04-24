import { createSupabaseServerClient } from '@/lib/supabase/server';
import PropertyCard from '@/components/PropertyCard';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createSupabaseServerClient();

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, city, price_per_night, property_photos(storage_path, position)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <section className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold">Réservez votre prochain séjour</h1>
        <p className="mt-2 text-slate-600">
          Des logements soigneusement sélectionnés. Paiement sécurisé et caution maîtrisée via Stripe.
        </p>
      </section>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger les logements : {error.message}
        </div>
      )}

      {properties && properties.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-slate-600">
          Aucun logement publié pour le moment.
        </div>
      )}
    </div>
  );
}
