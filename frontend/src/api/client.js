const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getRootProblems: () => request('/root-problems'),
  getRootProblem: (id) => request(`/root-problems/${id}`),
  createRootProblem: (data) => request('/root-problems', { method: 'POST', body: data }),
  updateRootProblem: (id, data) => request(`/root-problems/${id}`, { method: 'PUT', body: data }),
  deleteRootProblem: (id) => request(`/root-problems/${id}`, { method: 'DELETE' }),
  getProjectsByRootProblem: (rpId) => request(`/root-problems/${rpId}/projects`),

  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: data }),
  setProjectPhase: (id, phase) => request(`/projects/${id}/phase`, { method: 'PATCH', body: { phase } }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  getTasks: (projectId) => request(`/tasks?project_id=${projectId}`),
  searchTasks: (query) => request(`/tasks?search=${encodeURIComponent(query)}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: data }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: data }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  getTaskLinks: (taskId) => request(`/task-links?task_id=${taskId}`),
  createTaskLink: (data) => request('/task-links', { method: 'POST', body: data }),
  deleteTaskLink: (id) => request(`/task-links/${id}`, { method: 'DELETE' }),

  getAssignments: (taskId) => request(`/assignments?task_id=${taskId}`),
  createAssignment: (data) => request('/assignments', { method: 'POST', body: data }),
  deleteAssignment: (id) => request(`/assignments/${id}`, { method: 'DELETE' }),

  getComments: (taskId) => request(`/comments?task_id=${taskId}`),
  createComment: (data) => request('/comments', { method: 'POST', body: data }),
  deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' }),

  getTags: () => request('/tags'),
  createTag: (data) => request('/tags', { method: 'POST', body: data }),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
  getTagItems: (id) => request(`/tags/${id}/items`),
  getTagsForTask: (taskId) => request(`/tags/for-task/${taskId}`),
  getTagsForProject: (projectId) => request(`/tags/for-project/${projectId}`),
  addTagToTask: (data) => request('/tags/task-tags', { method: 'POST', body: data }),
  removeTagFromTask: (data) => request('/tags/task-tags', { method: 'DELETE', body: data }),
  addTagToProject: (data) => request('/tags/project-tags', { method: 'POST', body: data }),
  removeTagFromProject: (data) => request('/tags/project-tags', { method: 'DELETE', body: data }),

  getInsights: () => request('/insights'),
  getInsight: (id) => request(`/insights/${id}`),
  createInsight: (data) => request('/insights', { method: 'POST', body: data }),
  updateInsight: (id, data) => request(`/insights/${id}`, { method: 'PUT', body: data }),
  deleteInsight: (id) => request(`/insights/${id}`, { method: 'DELETE' }),
  getTagsForInsight: (insightId) => request(`/insights/for-insight/${insightId}`),
  addTagToInsight: (data) => request('/insights/insight-tags', { method: 'POST', body: data }),
  removeTagFromInsight: (data) => request('/insights/insight-tags', { method: 'DELETE', body: data }),
  linkInsights: (data) => request('/insights/links', { method: 'POST', body: data }),
  unlinkInsights: (data) => request('/insights/links', { method: 'DELETE', body: data }),

  getStakeholderViews: (projectId) => request(`/stakeholder-views?project_id=${projectId}`),
  createStakeholderView: (data) => request('/stakeholder-views', { method: 'POST', body: data }),
  updateStakeholderView: (id, data) => request(`/stakeholder-views/${id}`, { method: 'PUT', body: data }),
  deleteStakeholderView: (id) => request(`/stakeholder-views/${id}`, { method: 'DELETE' }),

  getCalendarEvents: (from, to) => request(`/calendar?from=${from}&to=${to}`),
  createCalendarEvent: (data) => request('/calendar', { method: 'POST', body: data }),
  updateCalendarEvent: (id, data) => request(`/calendar/${id}`, { method: 'PUT', body: data }),
  deleteCalendarEvent: (id) => request(`/calendar/${id}`, { method: 'DELETE' }),
  syncCalendar: () => request('/calendar/sync', { method: 'POST' }),
  getCalDAVStatus: () => request('/calendar/caldav-status'),
};
