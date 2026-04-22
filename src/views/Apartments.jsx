import { useEffect, useState } from 'react'
import { supabase, uploadApartmentImage } from '../supabase.js'

const EMPTY = { name: '', address: '', price: 25, notes: '' }

export default function Apartments() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('apartments-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const openNew = () => {
    setEditing('new')
    setForm(EMPTY)
    setImageFile(null)
    setImagePreview(null)
    setError(null)
  }

  const openEdit = (apt) => {
    setEditing(apt.id)
    setForm({
      name: apt.name || '',
      address: apt.address || '',
      price: apt.price,
      notes: apt.notes || '',
    })
    setImageFile(null)
    setImagePreview(apt.image_url)
    setError(null)
  }

  const close = () => {
    setEditing(null)
    setForm(EMPTY)
    setImageFile(null)
    setImagePreview(null)
    setError(null)
  }

  const pickImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let image_url = editing !== 'new' ? items.find((i) => i.id === editing)?.image_url ?? null : null
      if (imageFile) {
        image_url = await uploadApartmentImage(imageFile)
      }
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        price: Number(form.price) || 0,
        notes: form.notes.trim() || null,
        image_url,
      }
      if (editing === 'new') {
        const { error } = await supabase.from('apartments').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('apartments').update(payload).eq('id', editing)
        if (error) throw error
      }
      close()
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (apt) => {
    if (!confirm(`Supprimer le logement "${apt.name}" et toutes ses données associées ?`)) return
    await supabase.from('apartments').delete().eq('id', apt.id)
  }

  if (loading) return <div className="muted">Chargement...</div>

  return (
    <section>
      <div className="section-header">
        <h2>Logements</h2>
        <button className="btn btn-primary" onClick={openNew}>
          + Nouveau logement
        </button>
      </div>

      {items.length === 0 && !editing && (
        <div className="empty-state">Aucun logement. Cliquez sur "Nouveau logement" pour commencer.</div>
      )}

      <div className="grid-apartments">
        {items.map((apt) => (
          <div key={apt.id} className="card apartment-card">
            {apt.image_url ? (
              <img className="apartment-image" src={apt.image_url} alt={apt.name} />
            ) : (
              <div className="apartment-image apartment-placeholder">🏠</div>
            )}
            <div className="apartment-body">
              <h3 className="apartment-name">{apt.name}</h3>
              {apt.address && <div className="muted small">{apt.address}</div>}
              <div className="apartment-price">
                {Number(apt.price).toFixed(2)} € <span className="muted small">/ ménage</span>
              </div>
              {apt.notes && <p className="small">{apt.notes}</p>}
              <div className="apartment-actions">
                <button className="btn btn-ghost" onClick={() => openEdit(apt)}>
                  Modifier
                </button>
                <button className="btn btn-danger" onClick={() => remove(apt)}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing === 'new' ? 'Nouveau logement' : 'Modifier le logement'}</h3>
            <form onSubmit={save} className="form-stack">
              <label className="field">
                <span className="field-label">Nom</span>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Appartement Paris 11"
                />
              </label>

              <label className="field">
                <span className="field-label">Adresse</span>
                <input
                  className="input"
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="12 rue de Lyon, 75011 Paris"
                />
              </label>

              <label className="field">
                <span className="field-label">Prix du ménage (€)</span>
                <input
                  className="input"
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Notes</span>
                <textarea
                  className="input"
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Code porte, remarques particulières..."
                />
              </label>

              <label className="field">
                <span className="field-label">Image</span>
                <input className="input" type="file" accept="image/*" onChange={pickImage} />
                {imagePreview && (
                  <img src={imagePreview} alt="preview" className="image-preview" />
                )}
              </label>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={close}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
