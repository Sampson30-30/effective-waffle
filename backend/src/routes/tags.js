const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tags ORDER BY name ASC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
      [name.trim().toLowerCase()]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tags WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// Cross-cut view: all tasks and projects with this tag
router.get('/:id/items', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [{ rows: tasks }, { rows: projects }, { rows: insights }] = await Promise.all([
      pool.query(
        `SELECT t.*, p.id AS project_id, p.name AS project_name, p.root_problem_id
         FROM task_tags tt
         JOIN tasks t ON t.id = tt.task_id
         JOIN projects p ON p.id = t.project_id
         WHERE tt.tag_id = $1
         ORDER BY t.created_at DESC`,
        [id]
      ),
      pool.query(
        `SELECT pr.*, rp.name AS root_problem_name
         FROM project_tags pt
         JOIN projects pr ON pr.id = pt.project_id
         LEFT JOIN root_problems rp ON rp.id = pr.root_problem_id
         WHERE pt.tag_id = $1
         ORDER BY pr.created_at DESC`,
        [id]
      ),
      pool.query(
        `SELECT i.*
         FROM insight_tags it
         JOIN insights i ON i.id = it.insight_id
         WHERE it.tag_id = $1
         ORDER BY i.created_at DESC`,
        [id]
      ),
    ]);

    res.json({ tasks, projects, insights });
  } catch (err) { next(err); }
});

// Task tag attach/detach
router.post('/task-tags', async (req, res, next) => {
  try {
    const { task_id, tag_id } = req.body;
    await pool.query(
      'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [task_id, tag_id]
    );
    res.status(201).json({ task_id, tag_id });
  } catch (err) { next(err); }
});

router.delete('/task-tags', async (req, res, next) => {
  try {
    const { task_id, tag_id } = req.body;
    await pool.query('DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2', [task_id, tag_id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// Project tag attach/detach
router.post('/project-tags', async (req, res, next) => {
  try {
    const { project_id, tag_id } = req.body;
    await pool.query(
      'INSERT INTO project_tags (project_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [project_id, tag_id]
    );
    res.status(201).json({ project_id, tag_id });
  } catch (err) { next(err); }
});

router.delete('/project-tags', async (req, res, next) => {
  try {
    const { project_id, tag_id } = req.body;
    await pool.query('DELETE FROM project_tags WHERE project_id = $1 AND tag_id = $2', [project_id, tag_id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// Get tags for a task
router.get('/for-task/:task_id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT t.* FROM tags t JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = $1 ORDER BY t.name',
      [req.params.task_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Get tags for a project
router.get('/for-project/:project_id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT t.* FROM tags t JOIN project_tags pt ON pt.tag_id = t.id WHERE pt.project_id = $1 ORDER BY t.name',
      [req.params.project_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
