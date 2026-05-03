import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function DashboardPage() {
  const [rootProblems, setRootProblems] = useState([]);
  const [projectsByRp, setProjectsByRp] = useState({});
  const [tagsByProject, setTagsByProject] = useState({});
  const [taskCountsByProject, setTaskCountsByProject] = useState({});
  const [recentInsights, setRecentInsights] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [emptyProjects, setEmptyProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [rps, insights, allTasks, allProjects] = await Promise.all([
        api.getRootProblems(),
        api.getInsights(),
        fetch('/api/tasks').then(r => r.json()),
        api.getProjects(),
      ]);

      setRootProblems(rps);
      setRecentInsights(insights.slice(0, 3));

      // Projects per root problem
      const byRp = {};
      const tagMap = {};
      const countMap = {};

      await Promise.all(
        rps.map(async (rp) => {
          const projects = await api.getProjectsByRootProblem(rp.id);
          byRp[rp.id] = projects;
          await Promise.all(
            projects.map(async (p) => {
              const [tags, tasks] = await Promise.all([
                api.getTagsForProject(p.id),
                api.getTasks(p.id),
              ]);
              tagMap[p.id] = tags;
              countMap[p.id] = tasks;
            })
          );
        })
      );

      setProjectsByRp(byRp);
      setTagsByProject(tagMap);
      setTaskCountsByProject(countMap);

      // Needs attention: overdue tasks
      const today = new Date().toISOString().slice(0, 10);
      const overdue = allTasks.filter(
        (t) => t.due_date && t.due_date.slice(0, 10) < today && t.status !== 'done'
      );
      setOverdueTasks(overdue.slice(0, 5));

      // Empty projects (no tasks at all)
      const empty = allProjects.filter(
        (p) => !allTasks.some((t) => t.project_id === p.id)
      );
      setEmptyProjects(empty.slice(0, 4));
    }
    load();
  }, []);

  const allProjects = Object.values(projectsByRp).flat();
  const totalProjects = allProjects.length;
  const discoveryCount = allProjects.filter(p => (p.phase ?? 'discovery') === 'discovery').length;
  const solutionCount = allProjects.filter(p => p.phase === 'solution').length;
  const totalTasks = Object.values(taskCountsByProject).flat().length;
  const inProgressTasks = Object.values(taskCountsByProject).flat().filter(t => t.status === 'in_progress').length;

  return (
    <div className="canvas-bg min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="font-sketch text-5xl text-teal-400 mb-1">Welcome to The Studio</h1>
          <p className="text-slate-400 text-sm">Here's where things stand today.</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Root Problems', value: rootProblems.length, colour: 'text-teal-400' },
            { label: 'Tasks in Progress', value: `${inProgressTasks} / ${totalTasks}`, colour: 'text-teal-400' },
            { label: 'In Discovery', value: discoveryCount, colour: 'text-amber-400' },
            { label: 'In Solution', value: solutionCount, colour: 'text-teal-400' },
          ].map((s) => (
            <div key={s.label} className="note-card px-5 py-4">
              <p className={`font-sketch text-3xl ${s.colour}`}>{s.value}</p>
              <p className="text-slate-400 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Root problems + projects */}
        {rootProblems.map((rp) => (
          <section key={rp.id}>
            <div
              className="note-card px-6 py-5 cursor-pointer mb-4"
              onClick={() => navigate(`/root-problems/${rp.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-sketch text-2xl text-teal-300 mb-1">{rp.name}</p>
                  {rp.thesis && (
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{rp.thesis}</p>
                  )}
                </div>
                <span className="text-slate-600 text-xs mt-1 shrink-0">
                  {(projectsByRp[rp.id] ?? []).length} projects →
                </span>
              </div>
            </div>

            {/* Project cards */}
            <div className="grid grid-cols-2 gap-3 pl-4">
              {(projectsByRp[rp.id] ?? []).map((p) => {
                const tasks = taskCountsByProject[p.id] ?? [];
                const done = tasks.filter(t => t.status === 'done').length;
                const tags = tagsByProject[p.id] ?? [];
                const phase = p.phase ?? 'discovery';
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}/tasks`)}
                    className="note-card px-4 py-3 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-sketch text-lg text-slate-200 group-hover:text-teal-300 transition-colors">
                        {p.name}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        phase === 'solution'
                          ? 'bg-teal-900/40 text-teal-400 border border-teal-700/50'
                          : 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                      }`}>
                        {phase === 'solution' ? 'Solution' : 'Discovery'}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((t) => (
                          <span key={t.id} className="bg-teal-900/40 text-teal-400 text-xs px-1.5 py-0.5 rounded-md">
                            #{t.name}
                          </span>
                        ))}
                      </div>
                      <span className="text-slate-600 text-xs shrink-0 ml-2">
                        {tasks.length > 0 ? `${done}/${tasks.length} done` : 'no tasks'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Bottom two panels */}
        <div className="grid grid-cols-2 gap-6">

          {/* Recent insights */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-sketch text-xl text-slate-300">Recent Insights</h2>
              <button onClick={() => navigate('/insights')} className="text-xs text-teal-500 hover:text-teal-300">
                all insights →
              </button>
            </div>
            <div className="space-y-2">
              {recentInsights.length === 0 && (
                <p className="text-slate-600 text-sm">No insights yet.</p>
              )}
              {recentInsights.map((i) => (
                <div
                  key={i.id}
                  onClick={() => navigate(`/insights/${i.id}`)}
                  className="note-card px-4 py-3 cursor-pointer group"
                >
                  <p className="font-sketch text-base text-slate-200 group-hover:text-teal-300 transition-colors leading-snug">
                    {i.title}
                  </p>
                  <p className="text-slate-500 text-xs mt-1 line-clamp-2">{i.body}</p>
                  {i.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {i.tags.map((t) => (
                        <span key={t.id} className="bg-violet-900/40 text-violet-400 text-xs px-1.5 py-0.5 rounded-md">
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Needs attention */}
          <section>
            <h2 className="font-sketch text-xl text-slate-300 mb-3">Needs Attention</h2>
            <div className="space-y-2">
              {overdueTasks.length === 0 && emptyProjects.length === 0 && (
                <p className="text-slate-600 text-sm">Everything looks good.</p>
              )}
              {overdueTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/projects/${t.project_id}/tasks`)}
                  className="note-card px-4 py-3 cursor-pointer group border-red-900/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <p className="text-slate-300 text-sm group-hover:text-teal-300 transition-colors truncate">
                      {t.title}
                    </p>
                  </div>
                  <p className="text-red-400 text-xs mt-1 pl-3.5">
                    overdue · {t.due_date?.slice(0, 10)}
                  </p>
                </div>
              ))}
              {emptyProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}/tasks`)}
                  className="note-card px-4 py-3 cursor-pointer group border-amber-900/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <p className="text-slate-300 text-sm group-hover:text-teal-300 transition-colors truncate">
                      {p.name}
                    </p>
                  </div>
                  <p className="text-amber-500 text-xs mt-1 pl-3.5">no tasks added yet</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
