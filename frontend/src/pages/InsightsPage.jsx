import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal';
import TagPicker from '../components/TagPicker';

const emptyForm = { title: '', body: '' };

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newTags, setNewTags] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getInsights().then(setInsights);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const insight = await api.createInsight(form);
    await Promise.all(newTags.map((t) => api.addTagToInsight({ insight_id: insight.id, tag_id: t.id })));
    const full = await api.getInsight(insight.id);
    setInsights([full, ...insights]);
    setForm(emptyForm);
    setNewTags([]);
    setShowModal(false);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await api.deleteInsight(id);
    setInsights(insights.filter((i) => i.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sketch text-4xl text-teal-400">Insights & Patterns</h1>
          <p className="text-slate-500 text-sm mt-1">Reusable thinking, decisions, and solution patterns</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New Insight
        </button>
      </div>

      {insights.length === 0 && <p className="text-slate-600 text-center mt-20">No insights yet. Capture the first one.</p>}

      <ul className="space-y-3">
        {insights.map((insight) => (
          <li key={insight.id} onClick={() => navigate(`/insights/${insight.id}`)}
            className="note-card px-5 py-4 cursor-pointer group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-sketch text-xl text-slate-200 group-hover:text-teal-300 transition-colors">{insight.title}</p>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{insight.body}</p>
                {insight.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {insight.tags.map((t) => (
                      <span key={t.id} className="bg-violet-900/40 text-violet-400 px-1.5 py-0.5 rounded-md text-xs">#{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={(e) => handleDelete(e, insight.id)}
                className="text-xs text-slate-600 hover:text-red-400 transition-colors shrink-0">Delete</button>
            </div>
          </li>
        ))}
      </ul>

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
