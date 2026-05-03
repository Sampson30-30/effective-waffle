import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function TagsIndexPage() {
  const [tags, setTags] = useState([]);
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getTags().then(setTags);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const tag = await api.createTag({ name: input.trim() });
    setTags((prev) => prev.find((t) => t.id === tag.id) ? prev : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    setInput('');
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await api.deleteTag(id);
    setTags(tags.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="font-sketch text-4xl text-teal-400">Themes & Tags</h1>
        <p className="text-slate-500 text-sm mt-1">Cross-cutting labels that connect work across projects</p>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input placeholder="New tag name..." value={input} onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Create</button>
      </form>

      {tags.length === 0 && <p className="text-slate-600 text-center mt-16">No tags yet.</p>}

      <div className="flex flex-wrap gap-3">
        {tags.map((t) => (
          <div key={t.id} onClick={() => navigate(`/tags/${t.id}`)}
            className="note-card flex items-center gap-2 px-4 py-2.5 cursor-pointer group">
            <span className="font-sketch text-lg text-teal-400">#{t.name}</span>
            <button onClick={(e) => handleDelete(e, t.id)}
              className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs leading-none">&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
