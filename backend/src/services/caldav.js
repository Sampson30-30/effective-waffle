const { DAVClient } = require('tsdav');
const ical = require('node-ical');
const { v4: uuidv4 } = require('uuid');

// CalDAV config — populated from env when Proton Bridge is ready
function formatLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const CALDAV_URL = process.env.CALDAV_URL || 'http://127.0.0.1:1080';
const CALDAV_USER = process.env.CALDAV_USER || '';
const CALDAV_PASS = process.env.CALDAV_PASS || '';
const CONNECTED = !!(CALDAV_USER && CALDAV_PASS);

let client = null;

async function getClient() {
  if (!CONNECTED) return null;
  if (client) return client;
  try {
    client = new DAVClient({
      serverUrl: CALDAV_URL,
      credentials: { username: CALDAV_USER, password: CALDAV_PASS },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    await client.login();
    return client;
  } catch (err) {
    console.error('[CalDAV] Connection failed:', err.message);
    client = null;
    return null;
  }
}

async function testConnection() {
  if (!CONNECTED) return false;
  try {
    const c = await getClient();
    return !!c;
  } catch {
    return false;
  }
}

async function fetchEvents() {
  const c = await getClient();
  if (!c) return [];
  try {
    const calendars = await c.fetchCalendars();
    const results = [];
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    to.setMonth(to.getMonth() + 3);

    for (const cal of calendars) {
      const objects = await c.fetchCalendarObjects({
        calendar: cal,
        timeRange: { start: from.toISOString(), end: to.toISOString() },
      });
      for (const obj of objects) {
        if (!obj.data) continue;
        const parsed = ical.sync.parseICS(obj.data);
        for (const key of Object.keys(parsed)) {
          const ev = parsed[key];
          if (ev.type !== 'VEVENT') continue;
          results.push({
            uid: ev.uid || obj.url,
            title: ev.summary || '(No title)',
            description: ev.description || null,
            start: ev.start instanceof Date ? formatLocal(ev.start) : ev.start,
            end: ev.end instanceof Date ? formatLocal(ev.end) : ev.end,
            allDay: !!(ev.datetype === 'date'),
          });
        }
      }
    }
    return results;
  } catch (err) {
    console.error('[CalDAV] Fetch failed:', err.message);
    return [];
  }
}

async function createEvent(event) {
  const c = await getClient();
  if (!c) return null;
  try {
    const calendars = await c.fetchCalendars();
    const cal = calendars[0];
    if (!cal) return null;
    const uid = uuidv4();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TaskTool//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${event.title}`,
      event.description ? `DESCRIPTION:${event.description}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    await c.createCalendarObject({
      calendar: cal,
      filename: `${uid}.ics`,
      iCalString: icsData,
    });
    return uid;
  } catch (err) {
    console.error('[CalDAV] Create failed:', err.message);
    return null;
  }
}

async function updateEvent(event) {
  if (!event.caldav_uid) return;
  const c = await getClient();
  if (!c) return;
  try {
    const calendars = await c.fetchCalendars();
    for (const cal of calendars) {
      const objects = await c.fetchCalendarObjects({ calendar: cal });
      const obj = objects.find((o) => o.url.includes(event.caldav_uid));
      if (!obj) continue;
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const icsData = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TaskTool//EN',
        'BEGIN:VEVENT',
        `UID:${event.caldav_uid}`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description}` : '',
        'END:VEVENT',
        'END:VCALENDAR',
      ].filter(Boolean).join('\r\n');
      await c.updateCalendarObject({ calendarObject: { ...obj, data: icsData } });
      return;
    }
  } catch (err) {
    console.error('[CalDAV] Update failed:', err.message);
  }
}

async function deleteEvent(uid) {
  const c = await getClient();
  if (!c) return;
  try {
    const calendars = await c.fetchCalendars();
    for (const cal of calendars) {
      const objects = await c.fetchCalendarObjects({ calendar: cal });
      const obj = objects.find((o) => o.url.includes(uid));
      if (!obj) continue;
      await c.deleteCalendarObject({ calendarObject: obj });
      return;
    }
  } catch (err) {
    console.error('[CalDAV] Delete failed:', err.message);
  }
}

module.exports = { testConnection, fetchEvents, createEvent, updateEvent, deleteEvent };
