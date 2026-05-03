import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Badge from '../components/Badge';

export default function TagPage() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [tag, setTag] = useState(null);
  const [items, setItems] = useState({ tasks: [], projects: [], insights: [] });

  useEffect(() => {
    api.getTags().then((tags) => setTag(tags.find((t) => t.id === parseInt(tagId))));
    api.getTagItems(tagId).then(setItems);
  }, [tagId]);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/tags" className="hover:text-teal-400 transition-colors">Themes & Tags</Link>
        <span>/</span>
        <span className="text-slate-300 font-medium">#{tag?.name ?? '...'}</span>
      </div>

      <h1 className="font-sketch text-4xl text-teal-400 mb-8">#{tag?.name}</h1>

      <section className="mb-8">
        <h2 className="font-sketch text-xl text-slate-400 mb-3">
          Projects <span className="text-slate-600 text-base">({items.projects.length})</span>
        </h2>
        {items.projects.length === 0 && <p className="text-sm text-slate-600">No projects with this tag.</p>}
        <ul className="space-y-2">
          {items.projects.map((p) => (
            <li key={p.id} onClick={() => navigate(`/projects/${p.id}/tasks`)}
              className="note-card px-5 py-3 cursor-pointer group">
              <p className="font-sketch text-lg text-slate-200 group-hover:text-teal-300 transition-colors">{p.name}</p>
              {p.root_problem_name && <p className="text-xs text-slate-500 mt-0.5">Root Problem: {p.root_problem_name}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-sketch text-xl text-slate-400 mb-3">
          Tasks <span className="text-slate-600 text-base">({items.tasks.length})</span>
        </h2>
        {items.tasks.length === 0 && <p className="text-sm text-slate-600">No tasks with this tag.</p>}
        <ul className="space-y-2">
          {items.tasks.map((t) => (
            <li key={t.id} onClick={() => navigate(`/projects/${t.project_id}/tasks`)}
              className="note-card px-5 py-3 cursor-pointer group">
              <div className="flex items-center justify-between">
                <p className="font-sketch text-lg text-slate-200 group-hover:text-teal-300 transition-colors">{t.title}</p>
                <div className="flex items-center gap-2">
                  <Badge label={t.priority} />
                  <Badge label={t.status} />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t.project_name}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-sketch text-xl text-slate-400 mb-3">
          Insights <span className="text-slate-600 text-base">({items.insights.length})</span>
        </h2>
        {items.insights.length === 0 && <p className="text-sm text-slate-600">No insights with this tag.</p>}
        <ul className="space-y-2">
          {items.insights.map((i) => (
            <li key={i.id} onClick={() => navigate(`/insights/${i.id}`)}
              className="note-card px-5 py-3 cursor-pointer group">
              <p className="font-sketch text-lg text-slate-200 group-hover:text-teal-300 transition-colors">{i.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{i.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
