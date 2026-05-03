import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Use local date parts to avoid UTC-shift bugs
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d) { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); return c; }
function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
// Compare using local date string so timezone doesn't shift the day
function sameDay(a, b) { return toDateStr(a) === toDateStr(b); }
// Parse a DB timestamp string (YYYY-MM-DDTHH:MM:SS) as local time — no UTC conversion
function parseLocalDate(str) {
  if (!str) return new Date();
  // Strip timezone suffix if present, then parse as local
  const clean = str.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
  // new Date('YYYY-MM-DDTHH:MM:SS') is treated as local time in most environments
  // but to be safe we parse manually
  const [datePart, timePart] = clean.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  if (!timePart) return new Date(y, mo - 1, d);
  const [h, mi, s] = timePart.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, s || 0);
}

function toTimeStr(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function eventColour(ev) {
  if (ev.task_id) return 'bg-teal-700/80 border-teal-500 text-teal-100';
  return 'bg-indigo-800/80 border-indigo-600 text-indigo-100';
}

const emptyForm = { title: '', description: '', date: '', start_time: '09:00', end_time: '10:00', all_day: false, recurrence: 'none', recurrence_end: '' };

export default function CalendarPage() {
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [dueTasks, setDueTasks] = useState([]);
  const [caldavConnected, setCaldavConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [clickedDate, setClickedDate] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadEvents = useCallback(async () => {
    let from, to;
    if (view === 'month') {
      from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    } else {
      from = startOfWeek(cursor);
      to = addDays(from, 6);
    }
    const evs = await api.getCalendarEvents(from.toISOString(), to.toISOString());
    setEvents(evs);
  }, [cursor, view]);

  useEffect(() => {
    loadEvents();
    api.getCalDAVStatus().then(({ connected }) => setCaldavConnected(connected));
    // Load all tasks that have a due date so they appear on the calendar
    fetch('/api/tasks').then(r => r.json()).then(tasks =>
      setDueTasks(tasks.filter(t => t.due_date && t.status !== 'done'))
    );
  }, [loadEvents]);

  function eventsOnDay(day) {
    return events.filter((ev) => {
      const start = parseLocalDate(ev.start_time);
      const end = parseLocalDate(ev.end_time);
      return toDateStr(start) <= toDateStr(day) && toDateStr(day) <= toDateStr(end);
    });
  }

  function tasksOnDay(day) {
    return dueTasks.filter((t) => t.due_date && sameDay(parseLocalDate(t.due_date), day));
  }

  function openCreate(date) {
    setEditTarget(null);
    setForm({ ...emptyForm, date: toDateStr(date) });
    setClickedDate(date);
    setShowModal(true);
  }

  function openEdit(e, ev) {
    e.stopPropagation();
    // Don't allow editing generated occurrences — edit the base event
    const realId = ev.base_id ?? ev.id;
    setEditTarget({ ...ev, id: realId });
    const d = parseLocalDate(ev.start_time);
    const end = parseLocalDate(ev.end_time);
    setForm({
      title: ev.title,
      description: ev.description || '',
      date: toDateStr(d),
      start_time: toTimeStr(d),
      end_time: toTimeStr(end),
      all_day: ev.all_day,
      recurrence: ev.recurrence || 'none',
      recurrence_end: ev.recurrence_end ? ev.recurrence_end.slice(0, 10) : '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Build timestamps from local date+time strings to avoid UTC day-shift
    const startStr = form.all_day ? `${form.date}T00:00:00` : `${form.date}T${form.start_time}:00`;
    const endStr   = form.all_day ? `${form.date}T23:59:59` : `${form.date}T${form.end_time}:00`;
    const payload = {
      title: form.title,
      description: form.description,
      start_time: startStr,
      end_time: endStr,
      all_day: form.all_day,
      recurrence: form.recurrence,
      recurrence_end: form.recurrence_end || null,
    };
    if (editTarget) {
      const updated = await api.updateCalendarEvent(editTarget.id, payload);
      setEvents(events.map((ev) => (ev.id === updated.id ? updated : ev)));
    } else {
      const created = await api.createCalendarEvent(payload);
      setEvents([...events, created]);
    }
    setShowModal(false);
  }

  async function handleDelete(id) {
    await api.deleteCalendarEvent(id);
    setEvents(events.filter((ev) => ev.id !== id));
    setShowModal(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const { synced } = await api.syncCalendar();
      await loadEvents();
      alert(`Synced ${synced} events from your calendar.`);
    } catch {
      alert('Sync failed — check CalDAV connection.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-sketch text-4xl text-teal-400">Calendar</h1>
          <div className="flex gap-1 bg-canvas-800 border border-slate-700 rounded-lg p-1">
            {['month', 'week'].map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                  view === v ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${caldavConnected ? 'bg-teal-900/40 text-teal-400' : 'bg-slate-700 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${caldavConnected ? 'bg-teal-400' : 'bg-slate-500'}`} />
            {caldavConnected ? 'iCalendar Synced' : 'Local only'}
          </div>
          {caldavConnected && (
            <button onClick={handleSync} disabled={syncing}
              className="text-xs text-teal-500 hover:text-teal-300 transition-colors disabled:opacity-50">
              {syncing ? 'Syncing...' : 'Sync now'}
            </button>
          )}
          <button onClick={() => setCursor(new Date())}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Today</button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => view === 'month'
          ? setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          : setCursor(addDays(cursor, -7))}
          className="text-slate-400 hover:text-teal-400 transition-colors text-lg">‹</button>
        <span className="font-sketch text-2xl text-slate-200 min-w-[200px] text-center">
          {view === 'month'
            ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
            : (() => {
                const ws = startOfWeek(cursor);
                const we = addDays(ws, 6);
                return `${ws.getDate()} ${MONTHS[ws.getMonth()]} — ${we.getDate()} ${MONTHS[we.getMonth()]} ${we.getFullYear()}`;
              })()
          }
        </span>
        <button onClick={() => view === 'month'
          ? setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          : setCursor(addDays(cursor, 7))}
          className="text-slate-400 hover:text-teal-400 transition-colors text-lg">›</button>
      </div>

      {view === 'month'
        ? <MonthView cursor={cursor} eventsOnDay={eventsOnDay} tasksOnDay={tasksOnDay} onDayClick={openCreate} onEventClick={openEdit} />
        : <WeekView cursor={cursor} eventsOnDay={eventsOnDay} tasksOnDay={tasksOnDay} onDayClick={openCreate} onEventClick={openEdit} />
      }

      {showModal && (
        <Modal title={editTarget ? 'Edit Event' : 'New Event'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Event title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <textarea placeholder="Description (optional)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={2} />
            <input type="date" required value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input type="checkbox" checked={form.all_day}
                onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
                className="accent-teal-500" />
              All day
            </label>
            {!form.all_day && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Start</label>
                  <input type="time" value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">End</label>
                  <input type="time" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
            )}

            <div className="border-t border-slate-700 pt-3 space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Repeat</label>
                <select value={form.recurrence}
                  onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                  className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {form.recurrence !== 'none' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Repeat until</label>
                  <input type="date" value={form.recurrence_end}
                    onChange={(e) => setForm({ ...form, recurrence_end: e.target.value })}
                    className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              {editTarget
                ? <button type="button" onClick={() => handleDelete(editTarget.id)}
                    className="text-sm text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                : <span />
              }
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
                <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  {editTarget ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function MonthView({ cursor, eventsOnDay, tasksOnDay, onDayClick, onEventClick }) {
  const today = new Date();
  const firstDay = startOfMonth(cursor);
  const startPad = firstDay.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(firstDay);
    d.setDate(1 - startPad + i);
    return d;
  });

  return (
    <div className="note-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-700">
        {DAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const dayEvents = eventsOnDay(day);
          const dayTasks = tasksOnDay(day);
          const total = dayEvents.length + dayTasks.length;
          return (
            <div key={i} onClick={() => onDayClick(day)}
              className={`min-h-[100px] p-2 border-b border-r border-slate-700/50 cursor-pointer transition-colors
                ${isCurrentMonth ? 'hover:bg-teal-900/10' : 'opacity-40'}
                ${i % 7 === 6 ? 'border-r-0' : ''}`}>
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1
                ${isToday ? 'bg-teal-500 text-white' : 'text-slate-400'}`}>
                {day.getDate()}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div key={ev.id} onClick={(e) => onEventClick(e, ev)}
                    className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${eventColour(ev)}`}>
                    {ev.recurrence && ev.recurrence !== 'none' && <span className="mr-0.5 opacity-70">↻</span>}
                    {ev.all_day ? ev.title : `${toTimeStr(parseLocalDate(ev.start_time))} ${ev.title}`}
                  </div>
                ))}
                {dayTasks.slice(0, 2 - Math.min(dayEvents.length, 2)).map((t) => (
                  <div key={`task-${t.id}`}
                    className="text-xs px-1.5 py-0.5 rounded border truncate bg-violet-900/60 border-violet-600 text-violet-200">
                    ✓ {t.title}
                  </div>
                ))}
                {total > 2 && <p className="text-xs text-slate-600">+{total - 2} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, eventsOnDay, tasksOnDay, onDayClick, onEventClick }) {
  const today = new Date();
  const weekStart = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="note-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-700">
        {days.map((day, i) => {
          const isToday = sameDay(day, today);
          return (
            <div key={i} className="px-2 py-3 text-center border-r border-slate-700/50 last:border-r-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{DAYS[day.getDay()]}</p>
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mt-1
                ${isToday ? 'bg-teal-500 text-white' : 'text-slate-300'}`}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 min-h-[480px]">
        {days.map((day, i) => {
          const dayEvents = eventsOnDay(day);
          const dayTasks = tasksOnDay(day);
          return (
            <div key={i} onClick={() => onDayClick(day)}
              className="p-2 border-r border-slate-700/50 last:border-r-0 cursor-pointer hover:bg-teal-900/10 transition-colors">
              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                {dayEvents.map((ev) => (
                  <div key={ev.id} onClick={(e) => onEventClick(e, ev)}
                    className={`text-xs px-2 py-1.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${eventColour(ev)}`}>
                    <p className="font-medium truncate">
                      {ev.recurrence && ev.recurrence !== 'none' && <span className="mr-0.5 opacity-70">↻</span>}
                      {ev.title}
                    </p>
                    {!ev.all_day && (
                      <p className="text-xs opacity-70 mt-0.5">
                        {toTimeStr(parseLocalDate(ev.start_time))} – {toTimeStr(parseLocalDate(ev.end_time))}
                      </p>
                    )}
                  </div>
                ))}
                {dayTasks.map((t) => (
                  <div key={`task-${t.id}`}
                    className="text-xs px-2 py-1.5 rounded border bg-violet-900/60 border-violet-600 text-violet-200">
                    <p className="font-medium truncate">✓ {t.title}</p>
                    <p className="text-xs opacity-60 mt-0.5 capitalize">{t.priority} priority</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
