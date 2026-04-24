import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import PhotoGallery from '@/components/PhotoGallery';
import BookingForm from '@/components/BookingForm';
import { formatEuros } from '@/lib/format';

export const revalidate = 0;

export default async function PropertyPage({ params }) {
  const supabase = createSupabaseServerClient();

  const { data: property } = await supabase
    .from('properties')
    .select('*, property_photos(storage_path, position)')
    .eq('id', params.id)
    .eq('is_published', true)
    .single();

  if (!property) notFound();

  const photos = (property.property_photos || []).sort((a, b) => a.position - b.position);

  const today = new Date().toISOString().slice(0, 10);
  const { data: busyBookings } = await supabase
    .from('bookings')
    .select('check_in, check_out')
    .eq('property_id', params.id)
    .in('status', ['pending', 'confirmed'])
    .gte('check_out', today);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">{property.title}</h1>
        <p className="text-slate-600 mt-1">
          {property.city}, {property.country} · {property.bedrooms} chambre(s) · {property.max_guests} voyageurs max.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <PhotoGallery photos={photos} title={property.title} />
          <section>
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-slate-700 whitespace-pre-line">{property.description}</p>
          </section>
          <section className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="text-lg font-semibold mb-3">Informations pratiques</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Prix / nuit</dt>
                <dd className="font-medium">{formatEuros(property.price_per_night)}</dd>
              </div>
              {property.cleaning_fee > 0 && (
                <div>
                  <dt className="text-slate-500">Frais de ménage</dt>
                  <dd className="font-medium">{formatEuros(property.cleaning_fee)}</dd>
                </div>
              )}
              {property.deposit_amount > 0 && (
                <div>
                  <dt className="text-slate-500">Caution (autorisation)</dt>
                  <dd className="font-medium">{formatEuros(property.deposit_amount)}</dd>
                </div>
              )}
              {property.address && (
                <div>
                  <dt className="text-slate-500">Adresse</dt>
                  <dd className="font-medium">{property.address}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        <div>
          <BookingForm
            property={property}
            busyBookings={busyBookings || []}
            hasUser={Boolean(user)}
          />
        </div>
      </div>
    </div>
  );
}
