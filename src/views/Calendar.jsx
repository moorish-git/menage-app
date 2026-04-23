import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../supabase.js'

const STATUS_META = {
  pending: { label: 'En attente', color: 'warn' },
  accepted: { label: 'Acceptée', color: 'success' },
  refused: { label: 'Refusée', color: 'danger' },
  done: { label: 'Terminée', color: 'info' },
}

export default function CalendarView() {
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(new Date())
  const [dates, setDates] = useState([])
  const [selected, setSelected] = useState(null)

  const load = async () => {
    const { data } = await supabase
      .from('cleaning_dates')
      .select('*, apartment:apartments(id, name, image_url)')
      .order('scheduled_date')
    setDates(data || [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('calendar-dates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_dates' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [cursor])

  const datesByDay = useMemo(() => {
    const map = {}
    dates.forEach((d) => {
      const key = d.scheduled_date
      if (!map[key]) map[key] = []
      map[key].push(d)
    })
    return map
  }, [dates])

  const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const navigate = (delta) => {
    if (view === 'month') setCursor(delta > 0 ? addMonths(cursor, 1) : subMonths(cursor, 1))
    else setCursor(delta > 0 ? addWeeks(cursor, 1) : subWeeks(cursor, 1))
  }

  const headerLabel = view === 'month'
    ? format(cursor, 'MMMM yyyy', { locale: fr })
    : `Semaine du ${format(weekDays[0], 'dd MMM', { locale: fr })} au ${format(weekDays[6], 'dd MMM yyyy', { locale: fr })}`

  return (
    <section>
      <div className="section-header">
        <h2>Calendrier</h2>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === 'month' ? 'view-toggle-btn-active' : ''}`}
            onClick={() => setView('month')}
          >
            Mois
          </button>
          <button
            className={`view-toggle-btn ${view === 'week' ? 'view-toggle-btn-active' : ''}`}
            onClick={() => setView('week')}
          >
            Semaine
          </button>
        </div>
      </div>

      <div className="calendar-nav">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>←</button>
        <span className="calendar-month">{headerLabel}</span>
        <button className="btn btn-ghost" onClick={() => navigate(1)}>→</button>
        <button className="btn btn-ghost" onClick={() => setCursor(new Date())}>
          Aujourd'hui
        </button>
      </div>

      <div className="legend">
        <span className="legend-item"><span className="legend-swatch legend-warn" /> En attente</span>
        <span className="legend-item"><span className="legend-swatch legend-success" /> Acceptée</span>
        <span className="legend-item"><span className="legend-swatch legend-info" /> Terminée</span>
        <span className="legend-item"><span className="legend-swatch legend-danger" /> Refusée</span>
      </div>

      {view === 'month' ? (
        <div className="calendar-grid">
          {weekdays.map((w) => (
            <div key={w} className="calendar-weekday">{w}</div>
          ))}
          {monthDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayDates = datesByDay[key] || []
            const isToday = isSameDay(day, new Date())
            const inMonth = isSameMonth(day, cursor)
            const priority = { pending: 0, accepted: 1, done: 2, refused: 3 }
            const dominant = dayDates.length > 0
              ? [...dayDates].sort((a, b) => priority[a.status] - priority[b.status])[0].status
              : null

            return (
              <div
                key={key}
                className={`cal-day ${inMonth ? '' : 'cal-day-out'} ${isToday ? 'cal-day-today' : ''} ${dominant ? `cal-day-has cal-day-${STATUS_META[dominant].color}` : ''}`}
                onClick={() => dayDates.length > 0 && setSelected({ day, items: dayDates })}
              >
                <div className="cal-day-num">{format(day, 'd')}</div>
                <div className="cal-day-events">
                  {dayDates.slice(0, 2).map((d) => (
                    <div key={d.id} className={`cal-event cal-event-${STATUS_META[d.status].color}`}>
                      <span className="cal-event-name">{d.apartment?.name || '?'}</span>
                    </div>
                  ))}
                  {dayDates.length > 2 && (
                    <div className="cal-more">+{dayDates.length - 2}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="week-agenda">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayDates = datesByDay[key] || []
            const isToday = isSameDay(day, new Date())
            return (
              <div key={key} className={`week-day ${isToday ? 'week-day-today' : ''}`}>
                <div className="week-day-header">
                  <div className="week-day-date">
                    <span className="week-day-name">
                      {format(day, 'EEEE', { locale: fr })}
                    </span>
                    <span className="week-day-num">{format(day, 'd MMM', { locale: fr })}</span>
                  </div>
                  {isToday && <span className="week-day-today-badge">Aujourd'hui</span>}
                </div>
                {dayDates.length === 0 ? (
                  <div className="week-day-empty">—</div>
                ) : (
                  <ul className="week-day-events">
                    {dayDates.map((d) => {
                      const meta = STATUS_META[d.status]
                      return (
                        <li
                          key={d.id}
                          className={`week-event week-event-${meta.color}`}
                          onClick={() => setSelected({ day, items: [d] })}
                        >
                          {d.apartment?.image_url ? (
                            <img className="week-event-img" src={d.apartment.image_url} alt="" />
                          ) : (
                            <div className="week-event-img week-event-img-ph">🏠</div>
                          )}
                          <div className="week-event-main">
                            <div className="week-event-title">{d.apartment?.name || 'Logement supprimé'}</div>
                            <div className="week-event-meta">
                              <span className={`badge badge-${meta.color}`}>{meta.label}</span>
                              <span className="muted small">{Number(d.price).toFixed(2)} €</span>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{format(selected.day, 'EEEE dd MMMM yyyy', { locale: fr })}</h3>
            <ul className="list">
              {selected.items.map((d) => (
                <li key={d.id} className="card date-item">
                  {d.apartment?.image_url ? (
                    <img className="date-thumb" src={d.apartment.image_url} alt="" />
                  ) : (
                    <div className="date-thumb date-thumb-placeholder">🏠</div>
                  )}
                  <div className="date-main">
                    <div className="date-title">{d.apartment?.name || 'Logement supprimé'}</div>
                    <div className="date-meta">💶 {Number(d.price).toFixed(2)} €</div>
                    <div className="date-meta">
                      <span className={`badge badge-${STATUS_META[d.status].color}`}>
                        {STATUS_META[d.status].label}
                      </span>
                    </div>
                    {d.admin_note && (
                      <div className="date-meta small"><strong>Note :</strong> {d.admin_note}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
