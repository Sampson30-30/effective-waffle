import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from './Modal';

const emptyForm = { audience: '', description: '' };

export default function StakeholderViewsPanel({ projectId }) {
  const [views, setViews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    api.getStakeholderViews(projectId).then(setViews);
  }, [projectId]);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(view) {
    setEditTarget(view);
    setForm({ audience: view.audience, description: view.description });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editTarget) {
      const updated = await api.updateStakeholderView(editTarget.id, form);
      setViews(views.map((v) => (v.id === updated.id ? updated : v)));
    } else {
      const created = await api.createStakeholderView({ ...form, project_id: projectId });
      setViews([...views, created]);
    }
    setShowModal(false);
    setForm(emptyForm);
  }

  async function handleDelete(id) {
    await api.deleteStakeholderView(id);
    setViews(views.filter((v) => v.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">How this project looks to different audiences</p>
        <button onClick={openCreate}
          className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          + Add View
        </button>
      </div>

      {views.length === 0 && (
        <p className="text-slate-600 text-sm text-center mt-12">
          No stakeholder views yet. Add one to translate this project for a specific audience.
        </p>
      )}

      <div className="space-y-4">
        {views.map((view) => (
          <div key={view.id} className="note-card px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-teal-900/40 text-teal-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {view.audience}
                  </span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{view.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(view)} className="text-xs text-slate-500 hover:text-teal-400 transition-colors">Edit</button>
                <button onClick={() => handleDelete(view.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editTarget ? 'Edit Stakeholder View' : 'New Stakeholder View'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Audience</label>
              <input required placeholder="e.g. Executive sponsor, Engineering team..." value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea required placeholder="How does this project look from their perspective?" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={5} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
              <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {editTarget ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
