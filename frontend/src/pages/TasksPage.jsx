import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import TagPicker from '../components/TagPicker';
import StakeholderViewsPanel from '../components/StakeholderViewsPanel';

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const emptyForm = { title: '', description: '', status: 'todo', priority: 'medium', due_date: '' };

const inputCls = 'w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500';
const selectCls = 'flex-1 bg-canvas-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500';

export default function TasksPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    api.getProject(projectId).then(setProject);
    api.getTasks(projectId).then(setTasks);
  }, [projectId]);

  async function handleCreateTask(e) {
    e.preventDefault();
    const t = await api.createTask({ ...form, project_id: parseInt(projectId) });
    setTasks([t, ...tasks]);
    setForm(emptyForm);
    setShowTaskModal(false);
  }

  async function handleStatusChange(task, status) {
    const updated = await api.updateTask(task.id, { ...task, status });
    setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask((prev) => prev?.id === updated.id ? updated : prev);
  }

  async function handleDeleteTask(id) {
    await api.deleteTask(id);
    setTasks(tasks.filter((t) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  }

  const columns = STATUSES.map((s) => ({ status: s, items: tasks.filter((t) => t.status === s) }));

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-teal-400 transition-colors">Home</Link>
        <span>/</span>
        {project?.root_problem_id && (
          <>
            <Link to={`/root-problems/${project.root_problem_id}`} className="hover:text-teal-400 transition-colors">Projects</Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-300 font-medium">{project?.name ?? '...'}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-sketch text-4xl text-teal-400">{project?.name ?? ''}</h1>
        {activeTab === 'tasks' && (
          <button onClick={() => setShowTaskModal(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + New Task
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-700">
        {['tasks', 'stakeholders'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {tab === 'tasks' ? 'Tasks' : 'Stakeholder Views'}
          </button>
        ))}
      </div>

      {activeTab === 'stakeholders' && project && <StakeholderViewsPanel projectId={project.id} />}

      {activeTab === 'tasks' && (
        <div className="grid grid-cols-3 gap-4">
          {columns.map(({ status, items }) => (
            <div key={status} className="bg-canvas-800/60 border border-slate-700/50 rounded-xl p-4">
              <h2 className="font-sketch text-lg text-slate-400 mb-3">
                {status.replace('_', ' ')} <span className="text-slate-600 text-base">({items.length})</span>
              </h2>
              <div className="space-y-2">
                {items.map((task) => (
                  <div key={task.id} onClick={() => setSelectedTask(task)}
                    className="note-card px-3 py-3 cursor-pointer group">
                    <p className="text-sm text-slate-200 group-hover:text-teal-300 transition-colors">{task.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge label={task.priority} />
                      {task.due_date && <span className="text-xs text-slate-600">{task.due_date.slice(0, 10)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showTaskModal && (
        <Modal title="New Task" onClose={() => setShowTaskModal(false)}>
          <form onSubmit={handleCreateTask} className="space-y-3">
            <input required placeholder="Task title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            <textarea placeholder="Description (optional)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls} rows={2} />
            <div className="flex gap-2">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectCls}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className={inputCls} />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowTaskModal(false)} className="text-sm text-slate-500 hover:text-slate-300">Cancel</button>
              <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)}
          onStatusChange={(s) => handleStatusChange(selectedTask, s)}
          onDelete={() => handleDeleteTask(selectedTask.id)} />
      )}
    </div>
  );
}

function TaskDetail({ task, onClose, onStatusChange, onDelete }) {
  const [assignments, setAssignments] = useState([]);
  const [comments, setComments] = useState([]);
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [commentForm, setCommentForm] = useState({ author: '', body: '' });
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);

  useEffect(() => {
    api.getAssignments(task.id).then(setAssignments);
    api.getComments(task.id).then(setComments);
    api.getTaskLinks(task.id).then(setLinkedTasks);
    api.getTagsForTask(task.id).then(setTaskTags);
  }, [task.id]);

  async function addTaskTag(tag) {
    await api.addTagToTask({ task_id: task.id, tag_id: tag.id });
    setTaskTags((prev) => prev.find((t) => t.id === tag.id) ? prev : [...prev, tag]);
  }

  async function removeTaskTag(tag) {
    await api.removeTagFromTask({ task_id: task.id, tag_id: tag.id });
    setTaskTags((prev) => prev.filter((t) => t.id !== tag.id));
  }

  useEffect(() => {
    if (!linkSearch.trim()) { setLinkResults([]); return; }
    const timer = setTimeout(() => {
      api.searchTasks(linkSearch).then((results) => setLinkResults(results.filter((r) => r.id !== task.id)));
    }, 250);
    return () => clearTimeout(timer);
  }, [linkSearch, task.id]);

  async function addLink(targetTaskId) {
    try {
      await api.createTaskLink({ task_id_a: task.id, task_id_b: targetTaskId });
      const updated = await api.getTaskLinks(task.id);
      setLinkedTasks(updated);
    } catch (_) {}
    setLinkSearch('');
    setLinkResults([]);
  }

  async function removeLink(linkId) {
    await api.deleteTaskLink(linkId);
    setLinkedTasks(linkedTasks.filter((l) => l.link_id !== linkId));
  }

  async function addAssignment(e) {
    e.preventDefault();
    const a = await api.createAssignment({ task_id: task.id, assignee_name: assignee });
    setAssignments([...assignments, a]);
    setAssignee('');
  }

  async function removeAssignment(id) {
    await api.deleteAssignment(id);
    setAssignments(assignments.filter((a) => a.id !== id));
  }

  async function addComment(e) {
    e.preventDefault();
    const c = await api.createComment({ task_id: task.id, ...commentForm });
    setComments([...comments, c]);
    setCommentForm({ author: '', body: '' });
  }

  async function removeComment(id) {
    await api.deleteComment(id);
    setComments(comments.filter((c) => c.id !== id));
  }

  const inputCls = 'w-full bg-canvas-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <Modal title={task.title} onClose={onClose}>
      <div className="space-y-5 text-sm max-h-[70vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-2">
          <Badge label={task.priority} />
          <Badge label={task.status} />
          {task.due_date && <span className="text-slate-500">{task.due_date.slice(0, 10)}</span>}
        </div>

        {task.description && <p className="text-slate-400">{task.description}</p>}

        <div>
          <p className="font-medium text-slate-400 mb-1">Status</p>
          <select value={task.status} onChange={(e) => onStatusChange(e.target.value)}
            className="bg-canvas-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500">
            {['todo', 'in_progress', 'done'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div>
          <p className="font-medium text-slate-400 mb-2">Tags</p>
          <TagPicker activeTags={taskTags} onAdd={addTaskTag} onRemove={removeTaskTag} />
        </div>

        <div>
          <p className="font-medium text-slate-400 mb-2">Assignees</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {assignments.map((a) => (
              <span key={a.id} className="flex items-center gap-1 bg-teal-900/40 text-teal-400 px-2 py-0.5 rounded-full text-xs">
                {a.assignee_name}
                <button onClick={() => removeAssignment(a.id)} className="hover:text-red-400 transition-colors">&times;</button>
              </span>
            ))}
          </div>
          <form onSubmit={addAssignment} className="flex gap-2">
            <input required placeholder="Name" value={assignee} onChange={(e) => setAssignee(e.target.value)}
              className="flex-1 bg-canvas-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">Assign</button>
          </form>
        </div>

        <div>
          <p className="font-medium text-slate-400 mb-2">Linked Tasks</p>
          <div className="space-y-1.5 mb-2">
            {linkedTasks.map((l) => (
              <div key={l.link_id} className="flex items-center justify-between bg-canvas-700 border border-slate-700 rounded-lg px-3 py-2">
                <div>
                  <span className="text-slate-300 text-xs font-medium">{l.title}</span>
                  <span className="text-slate-600 text-xs ml-2">— {l.project_name}</span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge label={l.status} />
                  <button onClick={() => removeLink(l.link_id)} className="text-slate-600 hover:text-red-400 transition-colors">&times;</button>
                </div>
              </div>
            ))}
            {linkedTasks.length === 0 && <p className="text-xs text-slate-600">No linked tasks yet.</p>}
          </div>
          <div className="relative">
            <input placeholder="Search tasks to link..." value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)} className={inputCls} />
            {linkResults.length > 0 && (
              <ul className="absolute z-10 w-full bg-canvas-800 border border-slate-600 rounded-lg shadow-xl mt-1 max-h-40 overflow-y-auto">
                {linkResults.map((r) => (
                  <li key={r.id} onClick={() => addLink(r.id)}
                    className="px-3 py-2 hover:bg-teal-900/30 cursor-pointer text-sm text-slate-300 hover:text-teal-300 transition-colors">
                    {r.title} <span className="text-slate-600 text-xs">— {r.project_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <p className="font-medium text-slate-400 mb-2">Comments</p>
          <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="bg-canvas-700 border border-slate-700 rounded-lg px-3 py-2 flex justify-between">
                <div>
                  <span className="font-medium text-slate-300 text-xs">{c.author}</span>
                  <p className="text-slate-400 text-xs mt-0.5">{c.body}</p>
                </div>
                <button onClick={() => removeComment(c.id)} className="text-slate-600 hover:text-red-400 ml-2 transition-colors">&times;</button>
              </div>
            ))}
          </div>
          <form onSubmit={addComment} className="space-y-2">
            <input required placeholder="Your name" value={commentForm.author}
              onChange={(e) => setCommentForm({ ...commentForm, author: e.target.value })} className={inputCls} />
            <textarea required placeholder="Comment" value={commentForm.body}
              onChange={(e) => setCommentForm({ ...commentForm, body: e.target.value })}
              rows={2} className={inputCls} />
            <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">Post</button>
          </form>
        </div>

        <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={async () => {
              const today = new Date();
              const pad = (n) => String(n).padStart(2, '0');
              const fallback = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
              const date = task.due_date ? task.due_date.slice(0, 10) : fallback;
              await api.createCalendarEvent({
                title: task.title,
                description: task.description || '',
                start_time: `${date}T09:00:00`,
                end_time: `${date}T10:00:00`,
                all_day: false,
                task_id: task.id,
              });
              alert('Event added to calendar.');
            }}
            className="text-xs text-teal-500 hover:text-teal-300 transition-colors"
          >
            + Add to calendar
          </button>
          <button onClick={onDelete} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Delete task</button>
        </div>
      </div>
    </Modal>
  );
}
