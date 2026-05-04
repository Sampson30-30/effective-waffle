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
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [allInsights, setAllInsights] = useState([]);
  const [showLinkPicker, setShowLinkPicker] = useState(null); // 'parent' | 'child'
  const [linkSearch, setLinkSearch] = useState('');

  useEffect(() => {
    load();
    api.getInsights().then(setAllInsights);
  }, [insightId]);

  async function load() {
    const data = await api.getInsight(insightId);
    setInsight(data);
    setTags(data.tags ?? []);
    setParents(data.parents ?? []);
    setChildren(data.children ?? []);
    setForm({ title: data.title, body: data.body });
  }

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

  async function addLink(other, direction) {
    const from_id = direction === 'child' ? parseInt(insightId) : other.id;
    const to_id   = direction === 'child' ? other.id : parseInt(insightId);
    await api.linkInsights({ from_id, to_id });
    if (direction === 'child') setChildren((prev) => prev.find((c) => c.id === other.id) ? prev : [...prev, other]);
    else setParents((prev) => prev.find((p) => p.id === other.id) ? prev : [...prev, other]);
    setShowLinkPicker(null);
    setLinkSearch('');
  }

  async function removeLink(other, direction) {
    const from_id = direction === 'child' ? parseInt(insightId) : other.id;
    const to_id   = direction === 'child' ? other.id : parseInt(insightId);
    await api.unlinkInsights({ from_id, to_id });
    if (direction === 'child') setChildren((prev) => prev.filter((c) => c.id !== other.id));
    else setParents((prev) => prev.filter((p) => p.id !== other.id));
  }

  if (!insight) return null;

  const myId = parseInt(insightId);
  const linkedIds = new Set([myId, ...parents.map((p) => p.id), ...children.map((c) => c.id)]);
  const pickable = allInsights.filter((i) => !linkedIds.has(i.id) &&
    (linkSearch === '' || i.title.toLowerCase().includes(linkSearch.toLowerCase()))
  );

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

        {/* Lineage section */}
        <div className="border-t border-slate-700 pt-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lineage</p>

          {/* Parents — built from */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500">Built from</span>
              <button onClick={() => { setShowLinkPicker('parent'); setLinkSearch(''); }}
                className="text-xs text-teal-600 hover:text-teal-400 transition-colors">+ link parent</button>
            </div>
            {parents.length === 0 && <p className="text-xs text-slate-600 italic">No parent insights linked yet</p>}
            <div className="flex flex-col gap-1">
              {parents.map((p) => (
                <div key={p.id} className="flex items-center gap-2 group">
                  <span className="text-slate-400 text-xs">↑</span>
                  <Link to={`/insights/${p.id}`} className="text-sm text-teal-400 hover:underline font-sketch">{p.title}</Link>
                  <button onClick={() => removeLink(p, 'parent')}
                    className="text-xs text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-auto">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Children — led to */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500">Led to</span>
              <button onClick={() => { setShowLinkPicker('child'); setLinkSearch(''); }}
                className="text-xs text-teal-600 hover:text-teal-400 transition-colors">+ link derived insight</button>
            </div>
            {children.length === 0 && <p className="text-xs text-slate-600 italic">No derived insights linked yet</p>}
            <div className="flex flex-col gap-1">
              {children.map((c) => (
                <div key={c.id} className="flex items-center gap-2 group">
                  <span className="text-slate-400 text-xs">↓</span>
                  <Link to={`/insights/${c.id}`} className="text-sm text-teal-400 hover:underline font-sketch">{c.title}</Link>
                  <button onClick={() => removeLink(c, 'child')}
                    className="text-xs text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-auto">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Captured {new Date(insight.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Link picker modal */}
      {showLinkPicker && (
        <Modal
          title={showLinkPicker === 'parent' ? 'Link a parent insight' : 'Link a derived insight'}
          onClose={() => { setShowLinkPicker(null); setLinkSearch(''); }}
        >
          <input
            autoFocus
            placeholder="Search insights..."
            value={linkSearch}
            onChange={(e) => setLinkSearch(e.target.value)}
            className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"
          />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {pickable.length === 0 && (
              <p className="text-sm text-slate-600 text-center py-4">No insights to link</p>
            )}
            {pickable.map((i) => (
              <button key={i.id} onClick={() => addLink(i, showLinkPicker)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors">
                <span className="font-sketch text-teal-300 text-base">{i.title}</span>
                {i.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{i.body}</p>}
              </button>
            ))}
          </div>
        </Modal>
      )}

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
