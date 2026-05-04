import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// Seeded random so layout is stable across renders
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const STAT_COLORS  = ['#fef08a', '#86efac', '#fdba74', '#93c5fd'];
const RP_COLOR     = '#c4b5fd';
const PROJ_COLORS  = ['#6ee7b7', '#93c5fd', '#fef08a', '#f9a8d4', '#fdba74', '#86efac'];
const INSIGHT_COLOR = '#fef08a';
const ATTN_COLOR    = '#fca5a5';

function rot(seed) {
  const r = seededRand(seed);
  return (r() * 5 - 2.5).toFixed(2);
}

function StickyNote({ color, rotation = 0, onClick, style = {}, className = '', children }) {
  return (
    <div
      onClick={onClick}
      className={`sticky-note ${className}`}
      style={{
        backgroundColor: color,
        transform: `rotate(${rotation}deg)`,
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [rootProblems, setRootProblems]         = useState([]);
  const [projectsByRp, setProjectsByRp]         = useState({});
  const [tagsByProject, setTagsByProject]       = useState({});
  const [taskCountsByProject, setTaskCountsByProject] = useState({});
  const [recentInsights, setRecentInsights]     = useState([]);
  const [overdueTasks, setOverdueTasks]         = useState([]);
  const [emptyProjects, setEmptyProjects]       = useState([]);
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
      setRecentInsights(insights.slice(0, 4));

      const byRp = {}, tagMap = {}, countMap = {};
      await Promise.all(rps.map(async (rp) => {
        const projects = await api.getProjectsByRootProblem(rp.id);
        byRp[rp.id] = projects;
        await Promise.all(projects.map(async (p) => {
          const [tags, tasks] = await Promise.all([api.getTagsForProject(p.id), api.getTasks(p.id)]);
          tagMap[p.id] = tags;
          countMap[p.id] = tasks;
        }));
      }));

      setProjectsByRp(byRp);
      setTagsByProject(tagMap);
      setTaskCountsByProject(countMap);

      const today = new Date().toISOString().slice(0, 10);
      setOverdueTasks(allTasks.filter(t => t.due_date && t.due_date.slice(0, 10) < today && t.status !== 'done').slice(0, 4));
      setEmptyProjects(allProjects.filter(p => !allTasks.some(t => t.project_id === p.id)).slice(0, 4));
    }
    load();
  }, []);

  const allProjects    = Object.values(projectsByRp).flat();
  const totalTasks     = Object.values(taskCountsByProject).flat().length;
  const inProgressTasks = Object.values(taskCountsByProject).flat().filter(t => t.status === 'in_progress').length;
  const discoveryCount = allProjects.filter(p => (p.phase ?? 'discovery') === 'discovery').length;
  const solutionCount  = allProjects.filter(p => p.phase === 'solution').length;

  const stats = [
    { label: 'Root Problems',     value: rootProblems.length },
    { label: 'Tasks in Progress', value: `${inProgressTasks} / ${totalTasks}` },
    { label: 'In Discovery',      value: discoveryCount },
    { label: 'In Solution',       value: solutionCount },
  ];

  return (
    <div className="canvas-bg min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div>
          <h1 className="font-sketch text-5xl text-teal-400 mb-1">Welcome to The Studio</h1>
          <p className="text-slate-400 text-sm">Here's where things stand today.</p>
        </div>

        {/* Stats — small square sticky notes */}
        <section>
          <h2 className="font-sketch text-xl text-slate-400 mb-4">At a glance</h2>
          <div className="flex flex-wrap gap-5">
            {stats.map((s, i) => (
              <StickyNote
                key={s.label}
                color={STAT_COLORS[i]}
                rotation={rot(i * 17)}
                style={{ width: 140, minHeight: 110, padding: '14px 14px 20px', cursor: 'default' }}
              >
                <div className="note-title" style={{ fontSize: '2rem', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>{s.label}</div>
              </StickyNote>
            ))}
          </div>
        </section>

        {/* Root problems + projects */}
        {rootProblems.map((rp) => {
          const projects = projectsByRp[rp.id] ?? [];
          return (
            <section key={rp.id}>
              <div className="flex flex-wrap gap-5 items-start">
                {/* Root problem note — wider */}
                <StickyNote
                  color={RP_COLOR}
                  rotation={rot(rp.id * 3)}
                  onClick={() => navigate(`/root-problems/${rp.id}`)}
                  style={{ width: 220, minHeight: 160, cursor: 'pointer' }}
                >
                  <div className="note-title">{rp.name}</div>
                  {rp.thesis && (
                    <div className="note-body" style={{ WebkitLineClamp: 4 }}>{rp.thesis}</div>
                  )}
                  <div style={{ position: 'absolute', bottom: 8, right: 32, fontSize: '0.7rem', color: 'rgba(0,0,0,0.35)' }}>
                    {projects.length} projects →
                  </div>
                </StickyNote>

                {/* Project notes */}
                {projects.map((p, pi) => {
                  const tasks = taskCountsByProject[p.id] ?? [];
                  const done  = tasks.filter(t => t.status === 'done').length;
                  const tags  = tagsByProject[p.id] ?? [];
                  const phase = p.phase ?? 'discovery';
                  return (
                    <StickyNote
                      key={p.id}
                      color={PROJ_COLORS[(rp.id + pi) % PROJ_COLORS.length]}
                      rotation={rot(p.id * 7 + pi)}
                      onClick={() => navigate(`/projects/${p.id}/tasks`)}
                      style={{ width: 190, minHeight: 150, cursor: 'pointer' }}
                    >
                      <div style={{
                        position: 'absolute', top: 8, right: 28,
                        fontSize: '0.65rem', fontFamily: 'Inter, sans-serif', fontWeight: 600,
                        padding: '1px 6px', borderRadius: 4,
                        background: phase === 'solution' ? 'rgba(20,184,166,0.2)' : 'rgba(245,158,11,0.2)',
                        color: phase === 'solution' ? '#0f766e' : '#92400e',
                      }}>
                        {phase}
                      </div>
                      <div className="note-title">{p.name}</div>
                      {p.description && <div className="note-body">{p.description}</div>}
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {tags.slice(0, 3).map(t => (
                          <span key={t.id} style={{
                            fontSize: '0.7rem', padding: '1px 5px', borderRadius: 4,
                            background: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.5)',
                          }}>#{t.name}</span>
                        ))}
                      </div>
                      <div style={{ position: 'absolute', bottom: 8, right: 32, fontSize: '0.65rem', color: 'rgba(0,0,0,0.35)' }}>
                        {tasks.length > 0 ? `${done}/${tasks.length} done` : 'no tasks'}
                      </div>
                    </StickyNote>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Recent insights */}
        {recentInsights.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="font-sketch text-xl text-slate-400">Recent Insights</h2>
              <button onClick={() => navigate('/insights')} className="text-xs text-teal-500 hover:text-teal-300">
                all insights →
              </button>
            </div>
            <div className="flex flex-wrap gap-5">
              {recentInsights.map((ins, i) => (
                <StickyNote
                  key={ins.id}
                  color={INSIGHT_COLOR}
                  rotation={rot(ins.id * 13 + i)}
                  onClick={() => navigate(`/insights/${ins.id}`)}
                  style={{ width: 200, minHeight: 160, cursor: 'pointer' }}
                >
                  <div className="note-title">{ins.title}</div>
                  <div className="note-body">{ins.body}</div>
                  {ins.tags?.length > 0 && (
                    <div className="note-tags">
                      {ins.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="note-tag">#{t.name}</span>
                      ))}
                    </div>
                  )}
                </StickyNote>
              ))}
            </div>
          </section>
        )}

        {/* Needs attention */}
        {(overdueTasks.length > 0 || emptyProjects.length > 0) && (
          <section>
            <h2 className="font-sketch text-xl text-slate-400 mb-4">Needs Attention</h2>
            <div className="flex flex-wrap gap-5">
              {overdueTasks.map((t, i) => (
                <StickyNote
                  key={`od-${t.id}`}
                  color={ATTN_COLOR}
                  rotation={rot(t.id * 5 + i)}
                  onClick={() => navigate(`/projects/${t.project_id}/tasks`)}
                  style={{ width: 170, minHeight: 120, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '0.65rem', fontFamily: 'Inter, sans-serif', fontWeight: 700,
                    color: '#991b1b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Overdue
                  </div>
                  <div className="note-title" style={{ fontSize: '1rem' }}>{t.title}</div>
                  <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)' }}>
                    {t.due_date?.slice(0, 10)}
                  </div>
                </StickyNote>
              ))}
              {emptyProjects.map((p, i) => (
                <StickyNote
                  key={`ep-${p.id}`}
                  color="#fde68a"
                  rotation={rot(p.id * 11 + i)}
                  onClick={() => navigate(`/projects/${p.id}/tasks`)}
                  style={{ width: 170, minHeight: 120, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '0.65rem', fontFamily: 'Inter, sans-serif', fontWeight: 700,
                    color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    No tasks yet
                  </div>
                  <div className="note-title" style={{ fontSize: '1rem' }}>{p.name}</div>
                </StickyNote>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
