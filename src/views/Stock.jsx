import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

export default function Stock({ role }) {
  const [apartments, setApartments] = useState([])
  const [items, setItems] = useState([])
  const [selectedApt, setSelectedApt] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: 0, low_threshold: 1, unit: '' })
  const [saving, setSaving] = useState(false)

  const loadApartments = async () => {
    const { data } = await supabase.from('apartments').select('id, name, image_url').order('name')
    setApartments(data || [])
    if (data && data.length > 0 && !selectedApt) setSelectedApt(data[0].id)
  }

  const loadStock = async (apartmentId) => {
    if (!apartmentId) {
      setItems([])
      return
    }
    const { data } = await supabase
      .from('stock_items')
      .select('*')
      .eq('apartment_id', apartmentId)
      .order('name')
    setItems(data || [])
  }

  useEffect(() => {
    loadApartments().then(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadStock(selectedApt)
    const channel = supabase
      .channel('stock-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () =>
        loadStock(selectedApt)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [selectedApt])

  const adjust = async (item, delta) => {
    const next = Math.max(0, item.quantity + delta)
    await supabase
      .from('stock_items')
      .update({ quantity: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  }

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('stock_items').insert({
        apartment_id: selectedApt,
        name: form.name.trim(),
        quantity: Number(form.quantity) || 0,
        low_threshold: Number(form.low_threshold) || 1,
        unit: form.unit.trim() || null,
      })
      setShowForm(false)
      setForm({ name: '', quantity: 0, low_threshold: 1, unit: '' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!confirm(`Supprimer "${item.name}" ?`)) return
    await supabase.from('stock_items').delete().eq('id', item.id)
  }

  if (loading) return <div className="muted">Chargement...</div>

  if (apartments.length === 0) {
    return (
      <section>
        <h2>Stocks</h2>
        <div className="empty-state">Aucun logement. L'admin doit d'abord créer un logement.</div>
      </section>
    )
  }

  const currentApt = apartments.find((a) => a.id === selectedApt)

  return (
    <section>
      <div className="section-header">
        <h2>Stocks</h2>
        {selectedApt && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nouvel article
          </button>
        )}
      </div>

      <div className="apartment-selector">
        {apartments.map((a) => (
          <button
            key={a.id}
            className={`apt-pill ${selectedApt === a.id ? 'apt-pill-active' : ''}`}
            onClick={() => setSelectedApt(a.id)}
          >
            {a.image_url ? (
              <img src={a.image_url} alt="" className="apt-pill-img" />
            ) : (
              <span className="apt-pill-img apt-pill-placeholder">🏠</span>
            )}
            {a.name}
          </button>
        ))}
      </div>

      {currentApt && items.length === 0 && (
        <div className="empty-state">Aucun article pour {currentApt.name}.</div>
      )}

      <ul className="list">
        {items.map((item) => {
          const low = item.quantity <= item.low_threshold
          return (
            <li key={item.id} className={`card stock-item ${low ? 'stock-item-low' : ''}`}>
              <div className="stock-main">
                <div className="stock-name">
                  {item.name}
                  {low && <span className="badge badge-danger">Bas</span>}
                </div>
                <div className="muted small">
                  Seuil d'alerte : {item.low_threshold}
                  {item.unit ? ` ${item.unit}` : ''}
                </div>
              </div>
              <div className="stock-qty">
                <button className="btn btn-ghost" onClick={() => adjust(item, -1)}>
                  −
                </button>
                <span className="stock-qty-value">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </span>
                <button className="btn btn-ghost" onClick={() => adjust(item, 1)}>
                  +
                </button>
                {role === 'admin' && (
                  <button className="btn btn-danger" onClick={() => remove(item)}>
                    ✕
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nouvel article — {currentApt?.name}</h3>
            <form onSubmit={create} className="form-stack">
              <label className="field">
                <span className="field-label">Nom</span>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Papier toilette"
                />
              </label>

              <label className="field">
                <span className="field-label">Quantité initiale</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Unité (optionnel)</span>
                <input
                  className="input"
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="rouleaux, litres, ..."
                />
              </label>

              <label className="field">
                <span className="field-label">Seuil d'alerte (quantité basse)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.low_threshold}
                  onChange={(e) => setForm({ ...form, low_threshold: e.target.value })}
                  required
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
