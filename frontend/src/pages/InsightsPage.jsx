import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal';
import TagPicker from '../components/TagPicker';

const emptyForm = { title: '', body: '' };

const NOTE_COLORS = [
  '#fef08a', // yellow
  '#86efac', // green
  '#93c5fd', // blue
  '#f9a8d4', // pink
  '#fdba74', // orange
  '#c4b5fd', // purple
  '#6ee7b7', // teal
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function getInitialPos(id, idx, canvasWidth) {
  const rand = seededRandom(id + idx * 7);
  const cols = Math.max(1, Math.floor((canvasWidth - 60) / 260));
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const x = 30 + col * 260 + rand() * 30 - 15;
  const y = 30 + row * 240 + rand() * 30 - 15;
  return { x, y };
}

function getColor(id) {
  return NOTE_COLORS[Math.abs(id) % NOTE_COLORS.length];
}

function getRotation(id) {
  const rand = seededRandom(id * 31);
  return (rand() * 6 - 3).toFixed(2);
}

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [positions, setPositions] = useState({});
  const [zOrders, setZOrders] = useState({});
  const [topZ, setTopZ] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newTags, setNewTags] = useState([]);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getInsights().then((data) => {
      setInsights(data);
      const w = canvasRef.current?.offsetWidth || 900;
      const pos = {};
      data.forEach((ins, idx) => {
        pos[ins.id] = getInitialPos(ins.id, idx, w);
      });
      setPositions(pos);
    });
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const insight = await api.createInsight(form);
    await Promise.all(newTags.map((t) => api.addTagToInsight({ insight_id: insight.id, tag_id: t.id })));
    const full = await api.getInsight(insight.id);
    const w = canvasRef.current?.offsetWidth || 900;
    const idx = insights.length;
    setInsights((prev) => [full, ...prev]);
    setPositions((prev) => ({ ...prev, [full.id]: getInitialPos(full.id, idx, w) }));
    setForm(emptyForm);
    setNewTags([]);
    setShowModal(false);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await api.deleteInsight(id);
    setInsights((prev) => prev.filter((i) => i.id !== id));
    setPositions((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function bringToFront(id) {
    const next = topZ + 1;
    setTopZ(next);
    setZOrders((prev) => ({ ...prev, [id]: next }));
  }

  function startDrag(e, id) {
    if (e.button !== 0) return;
    e.preventDefault();
    bringToFront(id);

    const startX = e.clientX - (positions[id]?.x ?? 0);
    const startY = e.clientY - (positions[id]?.y ?? 0);
    let moved = false;

    const el = e.currentTarget;
    el.classList.add('dragging');

    function onMove(ev) {
      moved = true;
      const x = ev.clientX - startX;
      const y = Math.max(0, ev.clientY - startY);
      setPositions((prev) => ({ ...prev, [id]: { x, y } }));
    }

    function onUp(ev) {
      el.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!moved) navigate(`/insights/${id}`);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div className="py-6 px-4">
      <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
        <div>
          <h1 className="font-sketch text-4xl text-teal-400">Insights & Patterns</h1>
          <p className="text-slate-500 text-sm mt-1">Drag notes around — click to open</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New Insight
        </button>
      </div>

      <div ref={canvasRef} className="sticky-canvas canvas-bg rounded-xl">
        {insights.length === 0 && (
          <p className="text-slate-600 text-center pt-32">No insights yet. Capture the first one.</p>
        )}
        {insights.map((insight) => {
          const pos = positions[insight.id] ?? { x: 30, y: 30 };
          const color = getColor(insight.id);
          const rot = getRotation(insight.id);
          const z = zOrders[insight.id] ?? 1;
          return (
            <div
              key={insight.id}
              className="sticky-note"
              style={{
                left: pos.x,
                top: pos.y,
                backgroundColor: color,
                transform: `rotate(${rot}deg)`,
                zIndex: z,
              }}
              onMouseDown={(e) => startDrag(e, insight.id)}
            >
              <button className="note-delete" onClick={(e) => handleDelete(e, insight.id)}>✕</button>
              <div className="note-title">{insight.title}</div>
              <div className="note-body">{insight.body}</div>
              {insight.tags?.length > 0 && (
                <div className="note-tags">
                  {insight.tags.map((t) => (
                    <span key={t.id} className="note-tag">#{t.name}</span>
                  ))}
                </div>
              )}
              {(insight.parents?.length > 0 || insight.children?.length > 0) && (
                <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '0.7rem', color: 'rgba(0,0,0,0.35)' }}>
                  {insight.parents?.length > 0 && <span title="Has parent insights">↑{insight.parents.length} </span>}
                  {insight.children?.length > 0 && <span title="Has derived insights">↓{insight.children.length}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <Modal title="New Insight" onClose={() => { setShowModal(false); setNewTags([]); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input required placeholder="Title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <textarea required placeholder="Capture the insight, pattern, or decision..." value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={5} />
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">Tags</p>
              <TagPicker activeTags={newTags}
                onAdd={(t) => setNewTags((prev) => prev.find((x) => x.id === t.id) ? prev : [...prev, t])}
                onRemove={(t) => setNewTags((prev) => prev.filter((x) => x.id !== t.id))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setShowModal(false); setNewTags([]); }} className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
              <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
