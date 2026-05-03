import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RootProblemsPage from './pages/RootProblemsPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import TagsIndexPage from './pages/TagsIndexPage';
import TagPage from './pages/TagPage';
import InsightsPage from './pages/InsightsPage';
import InsightDetailPage from './pages/InsightDetailPage';
import CalendarPage from './pages/CalendarPage';

const navLink = ({ isActive }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'}`;

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen canvas-bg font-sans">
        <nav className="border-b border-slate-700/50 px-6 py-3 flex items-center gap-6 bg-canvas-800/80 backdrop-blur-sm sticky top-0 z-30">
          <Link to="/" className="font-sketch text-2xl text-teal-400 hover:text-teal-300 transition-colors">
            The Studio
          </Link>
          <NavLink to="/problems" className={navLink}>Problems</NavLink>
          <NavLink to="/tags" className={navLink}>Themes</NavLink>
          <NavLink to="/insights" className={navLink}>Insights</NavLink>
          <NavLink to="/calendar" className={navLink}>Calendar</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/problems" element={<RootProblemsPage />} />
          <Route path="/root-problems/:rpId" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/tasks" element={<TasksPage />} />
          <Route path="/tags" element={<TagsIndexPage />} />
          <Route path="/tags/:tagId" element={<TagPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/insights/:insightId" element={<InsightDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
