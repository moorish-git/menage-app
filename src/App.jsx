import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'menage-app:tasks'
const ROOMS = ['Cuisine', 'Salon', 'Salle de bain', 'Chambre', 'WC', 'Entrée', 'Autre']
const FREQUENCIES = [
  { value: 1, label: 'Tous les jours' },
  { value: 2, label: 'Tous les 2 jours' },
  { value: 7, label: 'Chaque semaine' },
  { value: 14, label: 'Toutes les 2 semaines' },
  { value: 30, label: 'Chaque mois' },
]

const loadTasks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : defaultTasks()
  } catch {
    return defaultTasks()
  }
}

const defaultTasks = () => [
  { id: 't1', title: 'Passer l\'aspirateur', room: 'Salon', frequency: 7, lastDone: null },
  { id: 't2', title: 'Nettoyer le plan de travail', room: 'Cuisine', frequency: 1, lastDone: null },
  { id: 't3', title: 'Laver les sanitaires', room: 'Salle de bain', frequency: 7, lastDone: null },
  { id: 't4', title: 'Changer les draps', room: 'Chambre', frequency: 14, lastDone: null },
]

const daysSince = (iso) => {
  if (!iso) return Infinity
  const diffMs = Date.now() - new Date(iso).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const statusFor = (task) => {
  const d = daysSince(task.lastDone)
  if (d === Infinity) return { label: 'Jamais fait', tone: 'late' }
  if (d >= task.frequency) return { label: `En retard de ${d - task.frequency} j`, tone: 'late' }
  if (d >= task.frequency - 1) return { label: 'À faire aujourd\'hui', tone: 'due' }
  return { label: `Dans ${task.frequency - d} j`, tone: 'ok' }
}

export default function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [title, setTitle] = useState('')
  const [room, setRoom] = useState(ROOMS[0])
  const [frequency, setFrequency] = useState(7)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const addTask = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const newTask = {
      id: crypto.randomUUID(),
      title: trimmed,
      room,
      frequency: Number(frequency),
      lastDone: null,
    }
    setTasks((prev) => [newTask, ...prev])
    setTitle('')
  }

  const markDone = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, lastDone: new Date().toISOString() } : t))
    )
  }

  const resetTask = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, lastDone: null } : t)))
  }

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const visibleTasks = useMemo(() => {
    const withStatus = tasks.map((t) => ({ ...t, status: statusFor(t) }))
    const sorted = [...withStatus].sort((a, b) => {
      const order = { late: 0, due: 1, ok: 2 }
      return order[a.status.tone] - order[b.status.tone]
    })
    if (filter === 'all') return sorted
    if (filter === 'todo') return sorted.filter((t) => t.status.tone !== 'ok')
    return sorted.filter((t) => t.room === filter)
  }, [tasks, filter])

  const stats = useMemo(() => {
    const total = tasks.length
    const late = tasks.filter((t) => statusFor(t).tone === 'late').length
    const due = tasks.filter((t) => statusFor(t).tone === 'due').length
    return { total, late, due }
  }, [tasks])

  return (
    <div className="app">
      <header className="header">
        <h1>🧹 MénageApp</h1>
        <p className="subtitle">Suivez vos tâches ménagères sans y penser</p>
      </header>

      <section className="stats">
        <div className="stat">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Tâches</div>
        </div>
        <div className="stat stat-due">
          <div className="stat-value">{stats.due}</div>
          <div className="stat-label">À faire</div>
        </div>
        <div className="stat stat-late">
          <div className="stat-value">{stats.late}</div>
          <div className="stat-label">En retard</div>
        </div>
      </section>

      <form className="form" onSubmit={addTask}>
        <input
          className="input"
          type="text"
          placeholder="Nouvelle tâche (ex. Laver les vitres)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select className="select" value={room} onChange={(e) => setRoom(e.target.value)}>
          {ROOMS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          {FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          Ajouter
        </button>
      </form>

      <div className="filters">
        <button
          className={`chip ${filter === 'all' ? 'chip-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Toutes
        </button>
        <button
          className={`chip ${filter === 'todo' ? 'chip-active' : ''}`}
          onClick={() => setFilter('todo')}
        >
          À faire
        </button>
        {ROOMS.map((r) => (
          <button
            key={r}
            className={`chip ${filter === r ? 'chip-active' : ''}`}
            onClick={() => setFilter(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <ul className="list">
        {visibleTasks.length === 0 && (
          <li className="empty">Aucune tâche. Ajoutez-en une ci-dessus.</li>
        )}
        {visibleTasks.map((t) => (
          <li key={t.id} className={`task task-${t.status.tone}`}>
            <div className="task-main">
              <div className="task-title">{t.title}</div>
              <div className="task-meta">
                <span className="badge">{t.room}</span>
                <span className="badge">
                  {FREQUENCIES.find((f) => f.value === t.frequency)?.label ??
                    `Tous les ${t.frequency} j`}
                </span>
                <span className={`badge badge-${t.status.tone}`}>{t.status.label}</span>
                {t.lastDone && (
                  <span className="muted">
                    Fait le {new Date(t.lastDone).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
            <div className="task-actions">
              <button className="btn btn-done" onClick={() => markDone(t.id)}>
                ✓ Fait
              </button>
              {t.lastDone && (
                <button className="btn btn-ghost" onClick={() => resetTask(t.id)}>
                  ↺
                </button>
              )}
              <button className="btn btn-danger" onClick={() => removeTask(t.id)}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <footer className="footer">Données sauvegardées localement dans votre navigateur.</footer>
    </div>
  )
}
