import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
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

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
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

  return (
    <section>
      <div className="section-header">
        <h2>Calendrier</h2>
        <div className="calendar-nav">
          <button className="btn btn-ghost" onClick={() => setCursor(subMonths(cursor, 1))}>
            ←
          </button>
          <span className="calendar-month">
            {format(cursor, 'MMMM yyyy', { locale: fr })}
          </span>
          <button className="btn btn-ghost" onClick={() => setCursor(addMonths(cursor, 1))}>
            →
          </button>
          <button className="btn btn-ghost" onClick={() => setCursor(new Date())}>
            Aujourd'hui
          </button>
        </div>
      </div>

      <div className="legend">
        <span className="legend-item"><span className="legend-swatch legend-warn" /> En attente</span>
        <span className="legend-item"><span className="legend-swatch legend-success" /> Acceptée</span>
        <span className="legend-item"><span className="legend-swatch legend-info" /> Terminée</span>
        <span className="legend-item"><span className="legend-swatch legend-danger" /> Refusée</span>
      </div>

      <div className="calendar-grid">
        {weekdays.map((w) => (
          <div key={w} className="calendar-weekday">{w}</div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayDates = datesByDay[key] || []
          const isToday = isSameDay(day, new Date())
          const inMonth = isSameMonth(day, cursor)

          const priority = { pending: 0, accepted: 1, done: 2, refused: 3 }
          const dominantStatus = dayDates.length > 0
            ? [...dayDates].sort((a, b) => priority[a.status] - priority[b.status])[0].status
            : null

          return (
            <div
              key={key}
              className={`cal-day ${inMonth ? '' : 'cal-day-out'} ${isToday ? 'cal-day-today' : ''} ${dominantStatus ? `cal-day-has cal-day-${STATUS_META[dominantStatus].color}` : ''}`}
              onClick={() => dayDates.length > 0 && setSelected({ day, items: dayDates })}
            >
              <div className="cal-day-num">{format(day, 'd')}</div>
              <div className="cal-day-events">
                {dayDates.slice(0, 2).map((d) => (
                  <div key={d.id} className={`cal-event cal-event-${STATUS_META[d.status].color}`}>
                    <span className="cal-event-dot" />
                    <span className="cal-event-name">{d.apartment?.name || '?'}</span>
                  </div>
                ))}
                {dayDates.length > 2 && (
                  <div className="cal-more">+{dayDates.length - 2} autre{dayDates.length - 2 > 1 ? 's' : ''}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

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
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
