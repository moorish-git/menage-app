import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase, notify } from '../supabase.js'

const STATUS_LABELS = {
  pending: { label: 'En attente', tone: 'warn' },
  accepted: { label: 'Acceptée', tone: 'success' },
  refused: { label: 'Refusée', tone: 'danger' },
  done: { label: 'Terminée', tone: 'info' },
}

export default function CleaningDates({ role }) {
  const [dates, setDates] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ apartment_id: '', scheduled_date: '', admin_note: '', price: '' })
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    const [d, a] = await Promise.all([
      supabase
        .from('cleaning_dates')
        .select('*, apartment:apartments(id, name, image_url, address)')
        .order('scheduled_date', { ascending: true }),
      supabase.from('apartments').select('id, name, price').order('name'),
    ])
    if (!d.error) setDates(d.data || [])
    if (!a.error) setApartments(a.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('dates-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_dates' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const onApartmentPick = (id) => {
    const apt = apartments.find((a) => a.id === id)
    setForm((f) => ({ ...f, apartment_id: id, price: apt ? apt.price : '' }))
  }

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const apt = apartments.find((a) => a.id === form.apartment_id)
      if (!apt) throw new Error('Sélectionnez un logement')
      const { data, error } = await supabase
        .from('cleaning_dates')
        .insert({
          apartment_id: form.apartment_id,
          scheduled_date: form.scheduled_date,
          price: Number(form.price) || apt.price,
          admin_note: form.admin_note.trim() || null,
          status: 'pending',
        })
        .select()
        .single()
      if (error) throw error
      await notify({
        targetRole: 'cleaner',
        type: 'new_date',
        title: 'Nouvelle date de ménage',
        message: `${apt.name} — ${format(parseISO(form.scheduled_date), 'dd MMMM yyyy', { locale: fr })}`,
        relatedId: data.id,
      })
      setShowForm(false)
      setForm({ apartment_id: '', scheduled_date: '', admin_note: '', price: '' })
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const respond = async (d, status) => {
    let cleaner_note = null
    if (status === 'refused') {
      cleaner_note = prompt('Raison du refus (optionnel) :') || null
    }
    const { error } = await supabase
      .from('cleaning_dates')
      .update({ status, responded_at: new Date().toISOString(), cleaner_note })
      .eq('id', d.id)
    if (error) {
      alert(error.message)
      return
    }
    await notify({
      targetRole: 'admin',
      type: status === 'accepted' ? 'date_accepted' : 'date_refused',
      title: status === 'accepted' ? 'Date acceptée' : 'Date refusée',
      message: `${d.apartment?.name} — ${format(parseISO(d.scheduled_date), 'dd MMMM yyyy', { locale: fr })}${cleaner_note ? ` : ${cleaner_note}` : ''}`,
      relatedId: d.id,
    })
  }

  const markDone = async (d) => {
    if (!confirm('Marquer cette date comme terminée ?')) return
    await supabase
      .from('cleaning_dates')
      .update({ status: 'done', done_at: new Date().toISOString() })
      .eq('id', d.id)
  }

  const remove = async (d) => {
    if (!confirm('Supprimer cette date ?')) return
    await supabase.from('cleaning_dates').delete().eq('id', d.id)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return dates
    return dates.filter((d) => d.status === filter)
  }, [dates, filter])

  if (loading) return <div className="muted">Chargement...</div>

  return (
    <section>
      <div className="section-header">
        <h2>{role === 'admin' ? 'Dates de ménage' : 'Dates à valider'}</h2>
        {role === 'admin' && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={apartments.length === 0}
          >
            + Nouvelle date
          </button>
        )}
      </div>

      {role === 'admin' && apartments.length === 0 && (
        <div className="empty-state">Créez d'abord un logement dans l'onglet "Logements".</div>
      )}

      <div className="filters">
        {['all', 'pending', 'accepted', 'refused', 'done'].map((s) => (
          <button
            key={s}
            className={`chip ${filter === s ? 'chip-active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'Toutes' : STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">Aucune date.</div>
      ) : (
        <ul className="list">
          {filtered.map((d) => {
            const status = STATUS_LABELS[d.status]
            return (
              <li key={d.id} className="card date-item">
                {d.apartment?.image_url ? (
                  <img className="date-thumb" src={d.apartment.image_url} alt="" />
                ) : (
                  <div className="date-thumb date-thumb-placeholder">🏠</div>
                )}
                <div className="date-main">
                  <div className="date-title">
                    {d.apartment?.name || 'Logement supprimé'}
                    <span className={`badge badge-${status.tone}`}>{status.label}</span>
                  </div>
                  <div className="date-meta">
                    📅 {format(parseISO(d.scheduled_date), 'EEEE dd MMMM yyyy', { locale: fr })}
                  </div>
                  <div className="date-meta">💶 {Number(d.price).toFixed(2)} €</div>
                  {d.admin_note && (
                    <div className="date-meta small">
                      <strong>Admin :</strong> {d.admin_note}
                    </div>
                  )}
                  {d.cleaner_note && (
                    <div className="date-meta small">
                      <strong>Ménage :</strong> {d.cleaner_note}
                    </div>
                  )}
                </div>
                <div className="date-actions">
                  {role === 'cleaner' && d.status === 'pending' && (
                    <>
                      <button className="btn btn-done" onClick={() => respond(d, 'accepted')}>
                        ✓ Je prends
                      </button>
                      <button className="btn btn-danger" onClick={() => respond(d, 'refused')}>
                        ✕ Refuser
                      </button>
                    </>
                  )}
                  {role === 'cleaner' && d.status === 'accepted' && (
                    <button className="btn btn-done" onClick={() => markDone(d)}>
                      Marquer fait
                    </button>
                  )}
                  {role === 'admin' && (
                    <button className="btn btn-danger" onClick={() => remove(d)}>
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nouvelle date de ménage</h3>
            <form onSubmit={create} className="form-stack">
              <label className="field">
                <span className="field-label">Logement</span>
                <select
                  className="select"
                  value={form.apartment_id}
                  onChange={(e) => onApartmentPick(e.target.value)}
                  required
                >
                  <option value="">— Choisir —</option>
                  {apartments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Date</span>
                <input
                  className="input"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Prix (€)</span>
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
                <span className="field-label">Note (optionnel)</span>
                <textarea
                  className="input"
                  rows="2"
                  value={form.admin_note}
                  onChange={(e) => setForm({ ...form, admin_note: e.target.value })}
                  placeholder="Consignes particulières..."
                />
              </label>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '...' : 'Créer la date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
