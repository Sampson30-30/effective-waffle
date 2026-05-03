import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal';
import TagPicker from '../components/TagPicker';

const emptyForm = { name: '', description: '' };

const PHASE_STYLES = {
  discovery: {
    badge: 'bg-amber-900/40 text-amber-400 border border-amber-700/50',
    label: 'Discovery',
    next: 'solution',
    hint: 'Exploring the problem space — click to mark as Solution',
  },
  solution: {
    badge: 'bg-teal-900/40 text-teal-400 border border-teal-700/50',
    label: 'Solution',
    next: 'discovery',
    hint: 'In execution mode — click to mark as Discovery',
  },
};

function PhaseBadge({ phase, onToggle }) {
  const style = PHASE_STYLES[phase] ?? PHASE_STYLES.discovery;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(style.next); }}
      title={style.hint}
      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-70 shrink-0 ${style.badge}`}
    >
      {style.label}
    </button>
  );
}

function ProjectCard({ project: initialProject, onNavigate, onDelete }) {
  const [project, setProject] = useState(initialProject);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    api.getTagsForProject(project.id).then(setTags);
  }, [project.id]);

  async function togglePhase(newPhase) {
    const updated = await api.setProjectPhase(project.id, newPhase);
    setProject(updated);
  }

  async function addTag(tag) {
    await api.addTagToProject({ project_id: project.id, tag_id: tag.id });
    setTags((prev) => prev.find((t) => t.id === tag.id) ? prev : [...prev, tag]);
  }

  async function removeTag(tag) {
    await api.removeTagFromProject({ project_id: project.id, tag_id: tag.id });
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
  }

  return (
    <li className="note-card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate(project.id)}>
          <p className="font-sketch text-xl text-slate-200 hover:text-teal-300 transition-colors">{project.name}</p>
          {project.description && <p className="text-sm text-slate-500 mt-1">{project.description}</p>}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((t) => (
                <span key={t.id} className="bg-teal-900/40 text-teal-400 px-1.5 py-0.5 rounded-md text-xs">#{t.name}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PhaseBadge phase={project.phase} onToggle={togglePhase} />
          <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
            className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete</button>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-700 pt-3" onClick={(e) => e.stopPropagation()}>
        <TagPicker activeTags={tags} onAdd={addTag} onRemove={removeTag} />
      </div>
    </li>
  );
}

export default function ProjectsPage() {
  const { rpId } = useParams();
  const navigate = useNavigate();
  const [rootProblem, setRootProblem] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    api.getRootProblem(rpId).then(setRootProblem);
    api.getProjectsByRootProblem(rpId).then(setProjects);
  }, [rpId]);

  async function handleCreate(e) {
    e.preventDefault();
    const p = await api.createProject({ ...form, root_problem_id: parseInt(rpId) });
    setProjects([p, ...projects]);
    setForm(emptyForm);
    setShowModal(false);
  }

  async function handleDelete(id) {
    await api.deleteProject(id);
    setProjects(projects.filter((p) => p.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/problems" className="hover:text-teal-400 transition-colors">Root Problems</Link>
        <span>/</span>
        <span className="text-slate-300 font-medium">{rootProblem?.name ?? '...'}</span>
      </div>

      {rootProblem?.thesis && (
        <div className="note-card border-teal-800/50 px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-teal-500 uppercase tracking-wide mb-1">Thesis</p>
          <p className="text-sm text-slate-300">{rootProblem.thesis}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-sketch text-3xl text-teal-400">Projects</h2>
        <button onClick={() => setShowModal(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New Project
        </button>
      </div>

      {projects.length === 0 && <p className="text-slate-600 text-center mt-16">No projects yet.</p>}

      <ul className="space-y-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onNavigate={(id) => navigate(`/projects/${id}/tasks`)} onDelete={handleDelete} />
        ))}
      </ul>

      {showModal && (
        <Modal title="New Project" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input required placeholder="Project name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <textarea placeholder="Description (optional)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={3} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
              <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
