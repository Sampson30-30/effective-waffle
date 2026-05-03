import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import TagPicker from '../components/TagPicker';
import Modal from '../components/Modal';

export default function InsightDetailPage() {
  const { insightId } = useParams();
  const navigate = useNavigate();
  const [insight, setInsight] = useState(null);
  const [tags, setTags] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });

  useEffect(() => {
    api.getInsight(insightId).then((data) => {
      setInsight(data);
      setTags(data.tags ?? []);
      setForm({ title: data.title, body: data.body });
    });
  }, [insightId]);

  async function handleSave(e) {
    e.preventDefault();
    const updated = await api.updateInsight(insightId, form);
    setInsight((prev) => ({ ...prev, ...updated }));
    setEditing(false);
  }

  async function handleDelete() {
    await api.deleteInsight(insightId);
    navigate('/insights');
  }

  async function addTag(tag) {
    await api.addTagToInsight({ insight_id: parseInt(insightId), tag_id: tag.id });
    setTags((prev) => prev.find((t) => t.id === tag.id) ? prev : [...prev, tag]);
  }

  async function removeTag(tag) {
    await api.removeTagFromInsight({ insight_id: parseInt(insightId), tag_id: tag.id });
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
  }

  if (!insight) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/insights" className="hover:text-teal-400 transition-colors">Insights</Link>
        <span>/</span>
        <span className="text-slate-300 font-medium truncate">{insight.title}</span>
      </div>

      <div className="note-card px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-sketch text-3xl text-teal-300">{insight.title}</h1>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => setEditing(true)} className="text-sm text-slate-500 hover:text-teal-400 transition-colors">Edit</button>
            <button onClick={handleDelete} className="text-sm text-slate-600 hover:text-red-400 transition-colors">Delete</button>
          </div>
        </div>

        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{insight.body}</p>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</p>
          <TagPicker activeTags={tags} onAdd={addTag} onRemove={removeTag} />
        </div>

        <p className="text-xs text-slate-600">
          Captured {new Date(insight.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {editing && (
        <Modal title="Edit Insight" onClose={() => setEditing(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={6} />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
              <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
