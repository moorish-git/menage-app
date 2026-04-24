import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import PropertyForm from '../../PropertyForm';

export const revalidate = 0;

export default async function EditPropertyPage({ params }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (!property) notFound();

  const { data: photos } = await supabase
    .from('property_photos')
    .select('id, storage_path, position')
    .eq('property_id', property.id)
    .order('position');

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Modifier le logement</h1>
      <PropertyForm mode="edit" property={property} photos={photos || []} />
    </div>
  );
}
