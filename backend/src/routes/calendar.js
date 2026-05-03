const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const caldav = require('../services/caldav');

// Expand a recurring event into occurrences within [from, to]
function expandRecurring(ev, from, to) {
  if (ev.recurrence === 'none' || !ev.recurrence) return [ev];

  const results = [];
  const start = new Date(ev.start_time);
  const end = new Date(ev.end_time);
  const duration = end - start;
  const recEnd = ev.recurrence_end ? new Date(ev.recurrence_end) : new Date(to);
  const rangeFrom = new Date(from);
  const rangeTo = new Date(to);

  const stepDays = ev.recurrence === 'weekly' ? 7
    : ev.recurrence === 'fortnightly' ? 14
    : null; // monthly handled separately

  let cursor = new Date(start);
  let safetyLimit = 0;

  while (cursor <= recEnd && cursor <= rangeTo && safetyLimit < 500) {
    safetyLimit++;
    if (cursor >= rangeFrom) {
      const occEnd = new Date(cursor.getTime() + duration);
      results.push({
        ...ev,
        id: `${ev.id}_${cursor.toISOString().slice(0, 10)}`,
        start_time: formatLocalDT(cursor),
        end_time: formatLocalDT(occEnd),
        is_occurrence: true,
        base_id: ev.id,
      });
    }
    if (stepDays) {
      cursor = new Date(cursor.getTime() + stepDays * 86400000);
    } else {
      // monthly: same day next month
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      cursor = next;
    }
  }
  return results;
}

function formatLocalDT(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let query = 'SELECT * FROM calendar_events';
    const params = [];
    if (from && to) {
      query += ' WHERE start_time <= $2 AND (recurrence != \'none\' OR start_time >= $1)';
      params.push(from, to);
    }
    query += ' ORDER BY start_time ASC';
    const { rows } = await pool.query(query, params);

    // Expand recurring events into individual occurrences
    const expanded = rows.flatMap((ev) =>
      from && to ? expandRecurring(ev, from, to) : [ev]
    );
    expanded.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    res.json(expanded);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, start_time, end_time, all_day, task_id, recurrence, recurrence_end } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO calendar_events (title, description, start_time, end_time, all_day, task_id, recurrence, recurrence_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description || null, start_time, end_time, all_day || false,
       task_id || null, recurrence || 'none', recurrence_end || null]
    );
    const event = rows[0];
    const uid = await caldav.createEvent(event);
    if (uid) {
      await pool.query('UPDATE calendar_events SET caldav_uid = $1 WHERE id = $2', [uid, event.id]);
      event.caldav_uid = uid;
    }
    res.status(201).json(event);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, start_time, end_time, all_day, recurrence, recurrence_end } = req.body;
    const { rows } = await pool.query(
      `UPDATE calendar_events SET title=$1, description=$2, start_time=$3, end_time=$4,
       all_day=$5, recurrence=$6, recurrence_end=$7 WHERE id=$8 RETURNING *`,
      [title, description || null, start_time, end_time, all_day || false,
       recurrence || 'none', recurrence_end || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await caldav.updateEvent(rows[0]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [req.params.id]);
    if (rows[0]?.caldav_uid) await caldav.deleteEvent(rows[0].caldav_uid);
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/sync', async (req, res, next) => {
  try {
    const events = await caldav.fetchEvents();
    if (!events.length) return res.json({ synced: 0 });
    let synced = 0;
    for (const ev of events) {
      await pool.query(
        `INSERT INTO calendar_events (title, description, start_time, end_time, all_day, caldav_uid)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (caldav_uid) DO UPDATE
           SET title=$1, description=$2, start_time=$3, end_time=$4, all_day=$5`,
        [ev.title, ev.description, ev.start, ev.end, ev.allDay, ev.uid]
      );
      synced++;
    }
    res.json({ synced });
  } catch (err) { next(err); }
});

router.get('/caldav-status', async (_req, res, next) => {
  try {
    const connected = await caldav.testConnection();
    res.json({ connected });
  } catch (err) { next(err); }
});

module.exports = router;
