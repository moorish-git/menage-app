'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PHOTO_BUCKET, publicPhotoUrl } from '@/lib/photos';

const emptyForm = {
  title: '',
  description: '',
  address: '',
  city: '',
  country: 'France',
  price_per_night_eur: 80,
  cleaning_fee_eur: 30,
  deposit_amount_eur: 300,
  max_guests: 2,
  bedrooms: 1,
  is_published: false,
};

function centsFromEur(eur) {
  return Math.round(Number(eur) * 100);
}

function eurFromCents(cents) {
  return (Number(cents) / 100).toString();
}

export default function PropertyForm({ mode, property, photos }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const initialForm = property
    ? {
        title: property.title,
        description: property.description || '',
        address: property.address || '',
        city: property.city,
        country: property.country,
        price_per_night_eur: eurFromCents(property.price_per_night),
        cleaning_fee_eur: eurFromCents(property.cleaning_fee),
        deposit_amount_eur: eurFromCents(property.deposit_amount),
        max_guests: property.max_guests,
        bedrooms: property.bedrooms,
        is_published: property.is_published,
      }
    : emptyForm;

  const [form, setForm] = useState(initialForm);
  const [existingPhotos, setExistingPhotos] = useState(photos || []);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Non connecté.');
      setLoading(false);
      return;
    }

    const payload = {
      host_id: user.id,
      title: form.title,
      description: form.description,
      address: form.address,
      city: form.city,
      country: form.country,
      price_per_night: centsFromEur(form.price_per_night_eur),
      cleaning_fee: centsFromEur(form.cleaning_fee_eur),
      deposit_amount: centsFromEur(form.deposit_amount_eur),
      max_guests: Number(form.max_guests),
      bedrooms: Number(form.bedrooms),
      is_published: Boolean(form.is_published),
    };

    let propertyId = property?.id;

    if (mode === 'create') {
      const { data, error: insErr } = await supabase
        .from('properties')
        .insert(payload)
        .select('id')
        .single();
      if (insErr) {
        setError(insErr.message);
        setLoading(false);
        return;
      }
      propertyId = data.id;
    } else {
      const { error: upErr } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', propertyId);
      if (upErr) {
        setError(upErr.message);
        setLoading(false);
        return;
      }
    }

    // Upload photos
    for (const [idx, file] of newPhotoFiles.entries()) {
      const ext = file.name.split('.').pop();
      const path = `${propertyId}/${Date.now()}-${idx}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError(`Échec upload photo : ${upErr.message}`);
        setLoading(false);
        return;
      }
      await supabase.from('property_photos').insert({
        property_id: propertyId,
        storage_path: path,
        position: existingPhotos.length + idx,
      });
    }

    setLoading(false);
    router.push('/admin/properties');
    router.refresh();
  }

  async function deletePhoto(photo) {
    if (!confirm('Supprimer cette photo ?')) return;
    await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    await supabase.from('property_photos').delete().eq('id', photo.id);
    setExistingPhotos((list) => list.filter((p) => p.id !== photo.id));
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      <Field label="Titre">
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
        />
      </Field>
      <Field label="Description">
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ville">
          <input
            type="text"
            required
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </Field>
        <Field label="Pays">
          <input
            type="text"
            value={form.country}
            onChange={(e) => updateField('country', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </Field>
      </div>
      <Field label="Adresse (privée, non affichée aux visiteurs avant réservation)">
        <input
          type="text"
          value={form.address}
          onChange={(e) => updateField('address', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
        />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Prix/nuit (€)">
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={form.price_per_night_eur}
            onChange={(e) => updateField('price_per_night_eur', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </Field>
        <Field label="Ménage (€)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.cleaning_fee_eur}
            onChange={(e) => updateField('cleaning_fee_eur', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </Field>
        <Field label="Caution (€)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.deposit_amount_eur}
            onChange={(e) => updateField('deposit_amount_eur', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Voyageurs max.">
          <input
            type="number"
            min={1}
            value={form.max_guests}
            onChange={(e) => updateField('max_guests', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </Field>
        <Field label="Chambres">
          <input
            type="number"
            min={0}
            value={form.bedrooms}
            onChange={(e) => updateField('bedrooms', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_published}
          onChange={(e) => updateField('is_published', e.target.checked)}
        />
        Publier (visible sur le site)
      </label>

      <fieldset className="border-t border-slate-200 pt-4">
        <legend className="text-sm font-medium">Photos</legend>
        {existingPhotos.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicPhotoUrl(photo.storage_path)}
                  alt=""
                  className="w-24 h-24 object-cover rounded-md border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => deletePhoto(photo)}
                  className="absolute -top-2 -right-2 bg-white border border-slate-300 rounded-full w-6 h-6 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setNewPhotoFiles(Array.from(e.target.files || []))}
          className="mt-3 block text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">
          Les photos seront uploadées à l'enregistrement.
        </p>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        {loading ? 'Enregistrement…' : mode === 'create' ? 'Créer le logement' : 'Enregistrer'}
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
