require('dotenv').config();
const express = require('express');
const cors = require('cors');

const rootProblemsRouter = require('./routes/rootProblems');
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const taskLinksRouter = require('./routes/taskLinks');
const tagsRouter = require('./routes/tags');
const insightsRouter = require('./routes/insights');
const stakeholderViewsRouter = require('./routes/stakeholderViews');
const calendarRouter = require('./routes/calendar');
const assignmentsRouter = require('./routes/assignments');
const commentsRouter = require('./routes/comments');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/root-problems', rootProblemsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/task-links', taskLinksRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/stakeholder-views', stakeholderViewsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/comments', commentsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
