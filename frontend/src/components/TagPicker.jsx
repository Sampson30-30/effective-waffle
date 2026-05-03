import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export default function TagPicker({ activeTags, onAdd, onRemove }) {
  const [allTags, setAllTags] = useState([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api.getTags().then(setAllTags);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeIds = new Set(activeTags.map((t) => t.id));
  const filtered = allTags.filter(
    (t) => !activeIds.has(t.id) && t.name.includes(input.toLowerCase())
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const tag = await api.createTag({ name: input.trim() });
    setAllTags((prev) => prev.find((t) => t.id === tag.id) ? prev : [...prev, tag]);
    onAdd(tag);
    setInput('');
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {activeTags.map((t) => (
          <span key={t.id} className="flex items-center gap-1 bg-teal-900/40 text-teal-400 px-2 py-0.5 rounded-full text-xs font-medium">
            #{t.name}
            <button onClick={() => onRemove(t)} className="hover:text-red-400 leading-none transition-colors">&times;</button>
          </span>
        ))}
      </div>
      <div className="relative" ref={ref}>
        <input
          placeholder="Add a tag..."
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {open && (filtered.length > 0 || input.trim()) && (
          <ul className="absolute z-20 w-full bg-canvas-800 border border-slate-600 rounded-lg shadow-xl mt-1 max-h-40 overflow-y-auto">
            {filtered.map((t) => (
              <li key={t.id} onClick={() => { onAdd(t); setInput(''); setOpen(false); }}
                className="px-3 py-2 hover:bg-teal-900/30 cursor-pointer text-sm text-slate-300 hover:text-teal-300 transition-colors">
                #{t.name}
              </li>
            ))}
            {input.trim() && !allTags.find((t) => t.name === input.trim().toLowerCase()) && (
              <li onClick={handleCreate}
                className="px-3 py-2 hover:bg-teal-900/30 cursor-pointer text-sm text-teal-400 font-medium border-t border-slate-700 transition-colors">
                Create "#{input.trim()}"
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
