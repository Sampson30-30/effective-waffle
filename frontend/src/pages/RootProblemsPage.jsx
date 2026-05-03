import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal';

const emptyForm = { name: '', thesis: '' };

export default function RootProblemsPage() {
  const [rootProblems, setRootProblems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const navigate = useNavigate();

  useEffect(() => {
    api.getRootProblems().then(setRootProblems);
  }, []);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(e, rp) {
    e.stopPropagation();
    setEditTarget(rp);
    setForm({ name: rp.name, thesis: rp.thesis || '' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editTarget) {
      const updated = await api.updateRootProblem(editTarget.id, form);
      setRootProblems(rootProblems.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await api.createRootProblem(form);
      setRootProblems([created, ...rootProblems]);
    }
    setShowModal(false);
    setForm(emptyForm);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await api.deleteRootProblem(id);
    setRootProblems(rootProblems.filter((r) => r.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sketch text-4xl text-teal-400">Root Problems</h1>
          <p className="text-slate-500 text-sm mt-1">The fundamental problems you're solving</p>
        </div>
        <button onClick={openCreate} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New Root Problem
        </button>
      </div>

      {rootProblems.length === 0 && (
        <p className="text-slate-600 text-center mt-20">No root problems yet. Define the first one.</p>
      )}

      <ul className="space-y-3">
        {rootProblems.map((rp) => (
          <li key={rp.id} onClick={() => navigate(`/root-problems/${rp.id}`)} className="note-card px-5 py-4 cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-sketch text-xl text-teal-300">{rp.name}</p>
                {rp.thesis && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{rp.thesis}</p>}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={(e) => openEdit(e, rp)} className="text-xs text-slate-500 hover:text-teal-400 transition-colors">Edit</button>
                <button onClick={(e) => handleDelete(e, rp.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <Modal title={editTarget ? 'Edit Root Problem' : 'New Root Problem'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input required placeholder="What is the fundamental problem?" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Thesis</label>
              <textarea placeholder="Describe the deep shape of this problem..." value={form.thesis}
                onChange={(e) => setForm({ ...form, thesis: e.target.value })}
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
